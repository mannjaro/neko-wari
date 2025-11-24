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
      }

      mockRepo.put.mockResolvedValue(undefined)

      // When
      const result = await service.createCostDetail(inputData)

      //Then
      expect(result).toMatchObject({
        PK: "USER#user123",
        SK: `COST#${MOCK_DATE.getTime()}`,
        Price: 2500,
        Category: 'daily' as const,
        Memo: "Lunch with team",
        Timestamp: MOCK_DATE.getTime()
      })

      expect(mockRepo.put).toHaveBeenCalledTimes(1)
      // expect(mockRepo.put).toHaveBeenCalledWith(
      //   expect.objectContaining({
      //     PK: "USER#user123",
      //     EntityType: 'COST_DATA',
      //     Price: 1000
      //   })
      // )
    })
  })
})