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