import { describe, it, expect, vi, beforeEach } from "vitest";
import { costService } from "../lambda/backend/services/costService";
import { dynamoClient } from "../lambda/backend/lib/dynamoClient";
import type { CostDataItemResponse } from "../lambda/backend/schemas/responseSchema";

vi.mock("../lambda/backend/lib/dynamoClient", () => ({
  dynamoClient: {
    update: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("change-case", () => ({
  pascalCase: (str: string) => str,
}));

describe("CostService.updateCostDetail", () => {
  const mockedClient = dynamoClient as unknown as {
    update: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  const now = new Date("2025-01-01T00:00:00.000Z").toISOString();

  beforeEach(() => {
    mockedClient.update.mockReset();
    mockedClient.get.mockReset();
  });

  it("rejects negative price updates", async () => {
    await expect(
      costService.updateCostDetail("user-123", 1700000000000, {
        price: -1,
        updatedAt: now,
      })
    ).rejects.toThrow("Price cannot be negative");

    expect(mockedClient.update).not.toHaveBeenCalled();
  });

  it("rejects memos that exceed the character limit", async () => {
    const longMemo = "a".repeat(501);

    await expect(
      costService.updateCostDetail("user-123", 1700000000000, {
        memo: longMemo,
        updatedAt: now,
      })
    ).rejects.toThrow("Memo cannot exceed 500 characters");

    expect(mockedClient.update).not.toHaveBeenCalled();
  });

  it("delegates to the client when the payload is valid", async () => {
    const existingItem = {
      PK: "USER#user-123",
      SK: "COST#1700000000000",
      GSI1PK: "COST#2025-01",
      GSI1SK: "USER#user-123#1700000000000",
      EntityType: "COST_DATA" as const,
      CreatedAt: now,
      UpdatedAt: now,
      User: "Test User",
      Category: "daily" as const,
      Memo: "Old Memo",
      Price: 1000,
      Timestamp: 1700000000000,
      YearMonth: "2025-01",
    };

    mockedClient.get.mockResolvedValue(existingItem);

    const response: CostDataItemResponse = {
      ...existingItem,
      Memo: "Lunch",
      Price: 1200,
    };

    mockedClient.update.mockResolvedValue(response);

    await expect(
      costService.updateCostDetail("user-123", 1700000000000, {
        memo: "Lunch",
        price: 1200,
        updatedAt: now,
      })
    ).resolves.toEqual(response);

    expect(mockedClient.get).toHaveBeenCalledWith(
      "USER#user-123",
      "COST#1700000000000"
    );
    
    expect(mockedClient.update).toHaveBeenCalled();
  });
});
