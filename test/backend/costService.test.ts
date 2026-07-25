import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CostService } from '../../lambda/backend/features/cost/costService';
import { BaseRepository } from '../../lambda/backend/lib/dynamoClient';

describe("CostService", () => {
  let service: CostService;

  const mockRepo = {
    get: vi.fn(),
    put: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn()
  } satisfies BaseRepository

  const MOCK_DATE = new Date('2025-01-01T12:00:00Z')

  beforeEach(() => {
    service = new CostService(mockRepo);
    vi.useFakeTimers();

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createCostDetail', () => {
    vi.setSystemTime(MOCK_DATE)
    it('正常にコストデータを作成し、DynamoDBに保存する', async () => {
      // Given
      const inputData = {
        userId: 'user123',
        displayName: "John Doe",
        category: "daily" as const,
        memo: 'Lunch with team',
        price: 2500,
        costType: "split" as const,
      }

      mockRepo.put.mockResolvedValue(undefined)

      // When
      const result = await service.createCostDetail(inputData)

      //Then
      expect(result).toMatchObject({
        PK: "USER#user123",
        Price: 2500,
        Category: 'daily' as const,
        Memo: "Lunch with team",
        Timestamp: MOCK_DATE.getTime()
      })
      expect(result.SK).toMatch(/^COST#/)
      expect(result.Id).toBeTruthy()
      expect(result.SK).toBe(`COST#${result.Id}`)

      expect(mockRepo.put).toHaveBeenCalledTimes(1)
      // expect(mockRepo.put).toHaveBeenCalledWith(
      //   expect.objectContaining({
      //     PK: "USER#user123",
      //     EntityType: 'COST_DATA',
      //     Price: 1000
      //   })
      // )
    })

    it('同じ日付（同一timestamp）で複数登録しても互いに上書きされない', async () => {
      // Given
      const inputData = {
        userId: 'user123',
        displayName: "John Doe",
        category: "daily" as const,
        memo: 'Lunch with team',
        price: 2500,
        costType: "split" as const,
        timestamp: new Date('2025-01-15T12:00:00Z').getTime(),
      }

      mockRepo.put.mockResolvedValue(undefined)

      // When
      const firstItem = await service.createCostDetail(inputData)
      const secondItem = await service.createCostDetail({
        ...inputData,
        memo: 'Dinner with team',
      })

      // Then
      expect(firstItem.Timestamp).toBe(secondItem.Timestamp)
      expect(firstItem.Id).not.toBe(secondItem.Id)
      expect(firstItem.SK).not.toBe(secondItem.SK)

      expect(mockRepo.put).toHaveBeenCalledTimes(2)
    })

    it('JSTユーザーが当日を選んだ場合の正午UTCアンカーを受け付ける', async () => {
      // Given: 18:40 JST on 2026-07-25 (09:40Z). The client anchors the picked
      // date to noon UTC, so it submits a timestamp 2h20m ahead of the clock.
      vi.setSystemTime(new Date('2026-07-25T09:40:21Z'))
      mockRepo.put.mockResolvedValue(undefined)

      const inputData = {
        userId: 'user123',
        displayName: 'John Doe',
        category: 'daily' as const,
        memo: 'Lunch with team',
        price: 2500,
        costType: 'split' as const,
        timestamp: Date.UTC(2026, 6, 25, 12),
      }

      // When
      const result = await service.createCostDetail(inputData)

      // Then
      expect(result.Timestamp).toBe(Date.UTC(2026, 6, 25, 12))
      expect(result.YearMonth).toBe('2026-07')
      expect(mockRepo.put).toHaveBeenCalledTimes(1)
    })

    it('JST基準で翌日以降のtimestampは拒否する', async () => {
      // Given: JST 2026-07-25 18:40. Picking tomorrow yields a noon-UTC anchor
      // past the end of the JST day, which is genuinely in the future.
      vi.setSystemTime(new Date('2026-07-25T09:40:21Z'))

      const inputData = {
        userId: 'user123',
        displayName: 'John Doe',
        category: 'daily' as const,
        memo: 'Lunch with team',
        price: 2500,
        costType: 'split' as const,
        timestamp: Date.UTC(2026, 6, 26, 12),
      }

      // When / Then
      await expect(service.createCostDetail(inputData)).rejects.toThrow(
        'Timestamp cannot be in the future',
      )
      expect(mockRepo.put).not.toHaveBeenCalled()
    })

    it('JSTの月初深夜に登録してもUTC基準で前月に振り分けられない', async () => {
      // Given: 2026-08-01 08:00 JST is still 2026-07-31 23:00 UTC
      vi.setSystemTime(new Date('2026-07-31T23:00:00Z'))
      mockRepo.put.mockResolvedValue(undefined)

      const inputData = {
        userId: 'user123',
        displayName: 'John Doe',
        category: 'daily' as const,
        memo: 'Lunch with team',
        price: 2500,
        costType: 'split' as const,
      }

      // When
      const result = await service.createCostDetail(inputData)

      // Then
      expect(result.YearMonth).toBe('2026-08')
      expect(result.GSI1PK).toBe('COST#2026-08')
    })
  })

  describe('saveCostData', () => {
    it('LINE経由の登録もJSTの月に振り分ける', async () => {
      // Given: 2026-08-01 08:00 JST, i.e. 2026-07-31 23:00 UTC
      vi.setSystemTime(new Date('2026-07-31T23:00:00Z'))
      mockRepo.put.mockResolvedValue(undefined)

      // When
      await service.saveCostData('user123', {
        step: 'confirming',
        user: 'John Doe',
        category: 'daily',
        memo: 'Lunch',
        price: 2500,
      })

      // Then
      expect(mockRepo.put).toHaveBeenCalledTimes(1)
      expect(mockRepo.put).toHaveBeenCalledWith(
        expect.objectContaining({
          YearMonth: '2026-08',
          GSI1PK: 'COST#2026-08',
        }),
      )
    })
  })

  describe('getMonthlyCostData', () => {
    it('Idを持たない旧形式のレコードはSKからIdを補完する', async () => {
      // Given: records written before the Id attribute existed
      const legacyTimestamp = new Date('2025-01-15T12:00:00Z').getTime()
      mockRepo.query.mockResolvedValue([
        {
          PK: 'USER#user123',
          SK: `COST#${legacyTimestamp}`,
          EntityType: 'COST_DATA',
          User: 'John Doe',
          Category: 'daily',
          Memo: 'Lunch',
          Price: 2500,
          Timestamp: legacyTimestamp,
          YearMonth: '2025-01',
        },
        {
          PK: 'USER#user456',
          SK: 'COST#1736942400000-abcdef0123456789',
          EntityType: 'COST_DATA',
          Id: '1736942400000-abcdef0123456789',
          User: 'Jane Doe',
          Category: 'rent',
          Memo: '',
          Price: 80000,
          Timestamp: legacyTimestamp,
          YearMonth: '2025-01',
        },
      ])

      // When
      const items = await service.getMonthlyCostData('2025-01')

      // Then: the recovered Id round-trips back to the original sort key
      expect(items[0].Id).toBe(String(legacyTimestamp))
      expect(items[0].SK).toBe(`COST#${items[0].Id}`)
      // records that already carry an Id are left untouched
      expect(items[1].Id).toBe('1736942400000-abcdef0123456789')
    })
  })
})