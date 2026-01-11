import { SettlementService } from "../../../lambda/backend/features/settlement/settlementService";
import type { SettlementStatusItem } from "../../../lambda/shared/types";
import type { BaseRepository } from "../../../lambda/backend/lib/dynamoClient";
import type { Mock } from "vitest";
import { describe, it, expect, vi } from "vitest";

// モックリポジトリを作成
const createMockRepository = (): { [K in keyof BaseRepository]: Mock } => ({
  get: vi.fn(),
  put: vi.fn(),
  update: vi.fn(),
  query: vi.fn(),
  scan: vi.fn(),
  delete: vi.fn(),
  batchWrite: vi.fn(),
});

describe("SettlementService", () => {
  describe("completeSettlement", () => {
    it("レコードが存在しない場合、新規作成してから完了マークする", async () => {
      // Arrange
      const mockRepository = createMockRepository();
      const service = new SettlementService(mockRepository);

      // レコードが存在しない（nullを返す）
      mockRepository.get.mockResolvedValue(null);

      // 新規作成時の戻り値
      mockRepository.put.mockResolvedValue(undefined);

      // 更新後の戻り値
      const completedItem: SettlementStatusItem = {
        PK: "USER#相手",
        SK: "SETTLEMENT#2025-09",
        GSI1PK: "SETTLEMENT#2025-09",
        GSI1SK: "USER#相手",
        EntityType: "SETTLEMENT_STATUS",
        CreatedAt: "2025-09-01T00:00:00.000Z",
        UpdatedAt: "2025-09-15T00:00:00.000Z",
        UserId: "相手",
        YearMonth: "2025-09",
        Status: "completed",
        SettlementAmount: 0,
        SettlementDirection: "even",
        OtherUserId: "",
        CompletedAt: "2025-09-15T00:00:00.000Z",
        CompletedBy: "自分",
      };
      mockRepository.update.mockResolvedValue(completedItem);

      // Act
      const result = await service.completeSettlement({
        userId: "相手",
        yearMonth: "2025-09",
        completedBy: "自分",
      });

      // Assert
      // エラーが発生しないこと
      expect(result).toBeDefined();
      expect(result.Status).toBe("completed");
      expect(result.UserId).toBe("相手");
    });

    it("レコードが存在する場合、通常通り完了マークする", async () => {
      // Arrange
      const mockRepository = createMockRepository();
      const service = new SettlementService(mockRepository);

      // 既存のレコード
      const existingItem: SettlementStatusItem = {
        PK: "USER#相手",
        SK: "SETTLEMENT#2025-09",
        GSI1PK: "SETTLEMENT#2025-09",
        GSI1SK: "USER#相手",
        EntityType: "SETTLEMENT_STATUS",
        CreatedAt: "2025-09-01T00:00:00.000Z",
        UpdatedAt: "2025-09-01T00:00:00.000Z",
        UserId: "相手",
        YearMonth: "2025-09",
        Status: "pending",
        SettlementAmount: 5000,
        SettlementDirection: "pay",
        OtherUserId: "自分",
      };
      mockRepository.get.mockResolvedValue(existingItem);

      // 更新後の戻り値
      const completedItem: SettlementStatusItem = {
        ...existingItem,
        Status: "completed",
        CompletedAt: "2025-09-15T00:00:00.000Z",
        CompletedBy: "自分",
        UpdatedAt: "2025-09-15T00:00:00.000Z",
      };
      mockRepository.update.mockResolvedValue(completedItem);

      // Act
      const result = await service.completeSettlement({
        userId: "相手",
        yearMonth: "2025-09",
        completedBy: "自分",
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.Status).toBe("completed");
      expect(mockRepository.put).not.toHaveBeenCalled(); // 新規作成は呼ばれない
    });
  });
});
