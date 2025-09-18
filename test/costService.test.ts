import { costService } from "../lambda/backend/services/costService";
import { costDataRepository } from "../lambda/backend/repositories/costDataRepository";
import type { CostDataItemResponse } from "../lambda/backend/schemas/responseSchema";

jest.mock("../lambda/backend/repositories/costDataRepository", () => ({
  costDataRepository: {
    updateCostData: jest.fn(),
  },
}));

describe("CostService.updateCostDetail", () => {
  const mockedRepository =
    costDataRepository as jest.Mocked<typeof costDataRepository>;
  const now = new Date("2025-01-01T00:00:00.000Z").toISOString();

  beforeEach(() => {
    mockedRepository.updateCostData.mockReset();
  });

  it("rejects negative price updates", async () => {
    await expect(
      costService.updateCostDetail("user-123", 1700000000000, {
        price: -1,
        updatedAt: now,
      })
    ).rejects.toThrow("Price cannot be negative");

    expect(mockedRepository.updateCostData).not.toHaveBeenCalled();
  });

  it("rejects memos that exceed the character limit", async () => {
    const longMemo = "a".repeat(501);

    await expect(
      costService.updateCostDetail("user-123", 1700000000000, {
        memo: longMemo,
        updatedAt: now,
      })
    ).rejects.toThrow("Memo cannot exceed 500 characters");

    expect(mockedRepository.updateCostData).not.toHaveBeenCalled();
  });

  it("delegates to the repository when the payload is valid", async () => {
    const response: CostDataItemResponse = {
      PK: "USER#user-123",
      SK: "COST#1700000000000",
      GSI1PK: "COST#2025-01",
      GSI1SK: "USER#user-123#1700000000000",
      EntityType: "COST_DATA",
      CreatedAt: now,
      UpdatedAt: now,
      User: "Test User",
      Category: "daily",
      Memo: "Lunch",
      Price: 1200,
      Timestamp: 1700000000000,
      YearMonth: "2025-01",
    };

    mockedRepository.updateCostData.mockResolvedValue(response);

    await expect(
      costService.updateCostDetail("user-123", 1700000000000, {
        memo: "Lunch",
        price: 1200,
        updatedAt: now,
      })
    ).resolves.toEqual(response);

    expect(mockedRepository.updateCostData).toHaveBeenCalledWith(
      "user-123",
      1700000000000,
      {
        memo: "Lunch",
        price: 1200,
        updatedAt: now,
      }
    );
  });
});
