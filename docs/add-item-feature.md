# 新規項目追加機能

## 概要
ダッシュボードから直接、新しい支払い項目を追加できる機能を実装しました。

## 実装内容

### バックエンド

#### 1. API エンドポイント
- **POST /cost/create**
  - リクエストボディ: `{ userId: string, category: PaymentCategory, memo: string, price: number }`
  - レスポンス: 作成された `CostDataItem`

#### 2. データ層
- `costDataRepository.createCostData()`: DynamoDBに新しいコストデータを保存
- タイムスタンプ、YearMonth、GSI キーを自動生成
- TTL は設定しない（永続データ）

#### 3. ビジネスロジック層
- `costService.createCostDetail()`: ビジネスロジック検証を実行
- 検証ルール:
  - 金額が負でないこと
  - メモが500文字以内
  - ユーザーIDが空でないこと

### フロントエンド

#### 1. コンポーネント
- **AddDetailDialog**: 新規項目追加用のダイアログコンポーネント
  - ユーザー名入力フィールド
  - カテゴリ選択（日本語表記）
  - 備考入力フィールド
  - 金額入力フィールド（YenInput使用）
  - フォームバリデーション（Zod + react-hook-form）

#### 2. フック
- **useCreateCost**: 新規項目作成のカスタムフック
  - React Query でキャッシュを自動無効化
  - 作成後に該当月のデータを再取得

#### 3. サーバー関数
- **createCostDetail**: TanStack Start のサーバー関数
  - Hono クライアントでバックエンド API を呼び出し

#### 4. UI改善
- **categoryNames.ts**: カテゴリ名の日本語マッピング
  - 既存の EditDetailDialog と DetailDrawer でも使用
  - 一貫した日本語表記を実現

### 配置場所
- ダッシュボードヘッダーの右上に「新規追加」ボタンを配置
- Passkey設定ボタンの左側

## 使用方法

1. ダッシュボードの「新規追加」ボタンをクリック
2. ダイアログでユーザー名、カテゴリ、備考、金額を入力
3. 「追加する」ボタンをクリック
4. トースト通知で成功を確認
5. ダッシュボードが自動的に更新される

## ファイル構成

### バックエンド
- `lambda/backend/app.ts` - API エンドポイント定義
- `lambda/backend/handlers/updateHandlers.ts` - createCostHandler 追加
- `lambda/backend/services/costService.ts` - createCostDetail メソッド追加
- `lambda/backend/repositories/costDataRepository.ts` - createCostData メソッド追加
- `lambda/backend/schemas/requestSchema.ts` - CreateCostDetailSchema 追加
- `lambda/shared/types.ts` - CreateCostDataSchema 追加

### フロントエンド
- `frontend/src/components/AddDetailDialog.tsx` - 新規追加ダイアログ
- `frontend/src/hooks/useCreateCost.ts` - 作成フック
- `frontend/src/server/createDetail.ts` - サーバー関数
- `frontend/src/utils/categoryNames.ts` - カテゴリ名ユーティリティ
- `frontend/src/routes/dashboard.tsx` - ボタン配置
- `frontend/src/components/EditDetailDialog.tsx` - 日本語カテゴリ名対応
- `frontend/src/components/DetailDrawer.tsx` - 日本語カテゴリ名対応

## カテゴリマッピング

| 英語キー        | 日本語表示      |
|----------------|----------------|
| rent           | 家賃           |
| utilities      | 光熱費など      |
| furniture      | 家具/家電       |
| daily          | 日用品/食品     |
| transportation | 交通費         |
| other          | その他         |
