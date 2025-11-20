import { describe, it, expect, vi, beforeEach } from "vitest";
import { costService } from "../lambda/backend/services/costService";
import { dynamoClient } from "../lambda/backend/lib/dynamoClient";

vi.mock("../lambda/backend/lib/dynamoClient", () => ({
  dynamoClient: {
    delete: vi.fn(),
  },
}));

vi.mock("change-case", () => ({
  pascalCase: (str: string) => str,
}));

describe("CostService.deleteCostDetail", () => {
  const mockedClient = dynamoClient as unknown as {
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockedClient.delete.mockReset();
  });

  it("successfully deletes cost data", async () => {
    mockedClient.delete.mockResolvedValue(undefined);

    await expect(
      costService.deleteCostDetail("user-123", 1700000000000)
    ).resolves.toBeUndefined();

    expect(mockedClient.delete).toHaveBeenCalledWith(
      "USER#user-123",
      "COST#1700000000000"
    );
  });

  it("throws error when client delete fails", async () => {
    const error = new Error("DynamoDB delete failed");
    mockedClient.delete.mockRejectedValue(error);

    await expect(
      costService.deleteCostDetail("user-123", 1700000000000)
    ).rejects.toThrow("DynamoDB delete failed");

    expect(mockedClient.delete).toHaveBeenCalledWith(
      "USER#user-123",
      "COST#1700000000000"
    );
  });
});
