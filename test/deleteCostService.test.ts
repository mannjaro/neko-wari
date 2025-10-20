import { costService } from "../lambda/backend/services/costService";
import { costDataRepository } from "../lambda/backend/repositories/costDataRepository";

jest.mock("../lambda/backend/repositories/costDataRepository", () => ({
  costDataRepository: {
    deleteCostData: jest.fn(),
  },
}));

describe("CostService.deleteCostDetail", () => {
  const mockedRepository =
    costDataRepository as jest.Mocked<typeof costDataRepository>;

  beforeEach(() => {
    mockedRepository.deleteCostData.mockReset();
  });

  it("successfully deletes cost data", async () => {
    mockedRepository.deleteCostData.mockResolvedValue();

    await expect(
      costService.deleteCostDetail("user-123", 1700000000000)
    ).resolves.toBeUndefined();

    expect(mockedRepository.deleteCostData).toHaveBeenCalledWith(
      "user-123",
      1700000000000
    );
  });

  it("throws error when repository delete fails", async () => {
    const error = new Error("DynamoDB delete failed");
    mockedRepository.deleteCostData.mockRejectedValue(error);

    await expect(
      costService.deleteCostDetail("user-123", 1700000000000)
    ).rejects.toThrow("DynamoDB delete failed");

    expect(mockedRepository.deleteCostData).toHaveBeenCalledWith(
      "user-123",
      1700000000000
    );
  });
});
