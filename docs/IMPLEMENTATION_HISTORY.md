# LINE Bot Implementation History

## プロジェクト概要

LINE Bot サンプルアプリケーションの実装履歴です。AWS CDK、Lambda、Hono フレームワークを使用した支払い情報管理ボットを構築しました。

## アーキテクチャ

- **フロントエンド**: LINE Messaging API webhook
- **バックエンド**: AWS Lambda function with Hono web framework  
- **インフラ**: AWS CDK for deployment (API Gateway + Lambda)
- **データベース**: DynamoDB (セッション管理)
- **開発**: TypeScript with local development server support

## 実装フェーズ

### Phase 1: 基本ボット機能実装

#### 1.1 プロジェクト初期化
- CDK プロジェクトの作成
- LINE Bot SDK の導入
- 基本的なテキスト応答機能

#### 1.2 ボタンテンプレート機能
**実装内容:**
```typescript
// TemplateButtons型を使用したボタンテンプレート
const buttonTemplate: TemplateButtons = {
  type: "buttons",
  text: "支払い情報を選択してください",
  actions: [
    {
      type: "postback",
      label: "****",
      data: "payment_user=****"
    },
    {
      type: "postback", 
      label: "****",
      data: "payment_user=****"
    },
    {
      type: "postback",
      label: "キャンセル", 
      data: "payment_user=cancel"
    }
  ]
};
```

**機能:**
- "入力を始める" でボタンテンプレート表示
- ユーザー選択（****/****/キャンセル）
- postback イベントハンドリング

### Phase 2: カルーセルテンプレート実装

#### 2.1 支払いカテゴリ選択
**実装内容:**
```typescript
const carouselTemplate: TemplateCarousel = {
  type: "carousel",
  columns: [
    {
      thumbnailImageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&h=200&fit=crop",
      title: "家賃",
      text: "住居費・家賃の支払い",
      actions: [
        {
          type: "postback",
          label: "選択",
          data: `category=rent&user=${selectedUser}`
        },
        {
          type: "postback",
          label: "キャンセル",
          data: "payment_user=cancel"
        }
      ]
    },
    // 他のカテゴリも同様...
  ]
};
```

**カテゴリ一覧:**
- 🏠 家賃 - 住居費・家賃の支払い
- ⚡ 光熱費など - 電気・ガス・水道代
- 🛋️ 家具/家電 - 家具・家電製品
- 🛒 日用品/食品 - 食材・生活用品  
- 💳 その他 - その他の支払い

**画像:**
- Unsplash の高品質画像を使用
- 各カテゴリに関連する視覚的な画像

### Phase 3: ステート管理とフロー制御

#### 3.1 インメモリ状態管理
**初期実装:**
```typescript
type UserState = {
  step: "idle" | "user_selected" | "category_selected" | "waiting_price";
  user?: string;
  category?: string;
};

const userState = new Map<string, UserState>();
```

#### 3.2 ステップ検証とエラーハンドリング
**フロー制御:**
- 正常フロー: `idle → user_selected → category_selected → waiting_price → idle`
- 不正入力の検証
- エラーメッセージとリカバリ方法の提示

**エラーハンドリング:**
- ❌ 順序違いのボタン操作
- ❌ 不正なユーザー情報
- ❌ フロー途中でのテキスト入力
- ❌ 未知の操作

### Phase 4: DynamoDB統合

#### 4.1 依存関係の追加
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.665.0",
    "@aws-sdk/lib-dynamodb": "^3.665.0"
  }
}
```

#### 4.2 DynamoDB構成
**テーブル設計:**
```typescript
// CDK Stack
const db = new dynamodb.TableV2(this, "LineBotTable", {
  partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
  sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
  billing: dynamodb.Billing.onDemand(),
  timeToLiveAttribute: "ttl",
});
```

**アイテム構造:**
```json
{
  "PK": "user123456",
  "SK": "UserState", 
  "step": "waiting_price",
  "user": "****",
  "category": "rent",
  "memo": "備考テキスト",
  "price": 5000,
  "ttl": 1234567890
}
```

#### 4.3 ステート管理関数
```typescript
const getUserState = async (userId: string): Promise<UserState | null> => {
  // DynamoDB GetCommand
};

const saveUserState = async (userId: string, state: UserState): Promise<void> => {
  // DynamoDB PutCommand with TTL
};

const deleteUserState = async (userId: string): Promise<void> => {
  // DynamoDB DeleteCommand  
};
```

**特徴:**
- 24時間自動削除（TTL）
- エラーログ出力
- 非同期処理対応

### Phase 5: 備考入力と確認テンプレート

#### 5.1 フロー拡張
**新しいフロー:**
```
入力を始める → ユーザー選択 → カテゴリ選択 → 備考入力 → 金額入力 → 確認テンプレート → 完了
```

#### 5.2 UserState拡張
```typescript
type UserState = {
  step: "idle" | "user_selected" | "category_selected" | "waiting_memo" | "waiting_price" | "confirming";
  user?: string;
  category?: string;
  memo?: string;
  price?: number;
};
```

#### 5.3 確認テンプレート
```typescript
const confirmTemplate: TemplateConfirm = {
  type: "confirm",
  text: `以下の内容で登録しますか？\n\n👤 ${user}さん\n📋 ${category}\n📝 ${memo}\n💰 ${price}円`,
  actions: [
    {
      type: "postback",
      label: "登録する",
      data: "confirm=yes"
    },
    {
      type: "postback",
      label: "キャンセル", 
      data: "confirm=no"
    }
  ]
};
```

## 最終的なボットフロー

### ステップ別詳細

#### 1. 開始
- **ユーザー入力**: "入力を始める"
- **ボット応答**: ユーザー選択ボタンテンプレート
- **状態更新**: `step: "idle"`

#### 2. ユーザー選択
- **ユーザー操作**: ボタンクリック（****/****）
- **ボット応答**: カルーセルテンプレート（カテゴリ選択）
- **状態更新**: `step: "user_selected", user: "****"`

#### 3. カテゴリ選択
- **ユーザー操作**: カテゴリボタンクリック
- **ボット応答**: "備考があれば入力してください"
- **状態更新**: `step: "waiting_memo", category: "rent"`

#### 4. 備考入力
- **ユーザー入力**: テキスト入力
- **ボット応答**: "備考を保存しました。金額を入力してください"
- **状態更新**: `step: "waiting_price", memo: "電気代"`

#### 5. 金額入力
- **ユーザー入力**: 数値入力（例：5000）
- **ボット応答**: 確認テンプレート表示
- **状態更新**: `step: "confirming", price: 5000`

#### 6. 最終確認
- **ユーザー操作**: 登録する/キャンセルボタン
- **ボット応答**: 完了メッセージまたはキャンセルメッセージ
- **状態更新**: ステート削除

## 技術的特徴

### セキュリティ
- 入力値検証
- ステップ順序の厳格な制御
- 不正操作の検出とエラーハンドリング

### パフォーマンス
- DynamoDB On-Demand課金
- Lambda関数の最適化
- 外部モジュールのバンドル除外

### 可用性
- TTLによる自動クリーンアップ
- エラー時の適切なフォールバック
- 状態の永続化

### ユーザビリティ
- 直感的なボタン操作
- 視覚的なカルーセル表示
- 明確なエラーメッセージ
- 最終確認での安全性

## ファイル構成

```
line-bot-sample/
├── lambda/
│   ├── app.ts              # メインアプリケーションロジック
│   ├── handler.ts          # Lambda ハンドラー
│   └── index.ts           # ローカル開発サーバー
├── lib/
│   └── line-bot-sample-stack.ts  # CDK スタック定義
├── bin/
│   └── line-bot-sample.ts  # CDK アプリエントリーポイント
├── CLAUDE.md               # プロジェクト説明書
├── package.json            # 依存関係とスクリプト
└── IMPLEMENTATION_HISTORY.md  # この実装履歴
```

## 開発コマンド

### ローカル開発
```bash
npm run dev          # ローカル開発サーバー起動
npm run build        # TypeScript コンパイル（--noEmit）
npm run watch        # Watch モードコンパイル
npm run test         # Jest テスト実行
```

### CDK インフラ
```bash
npm run cdk          # CDK CLI アクセス
npm run cdk:watch    # Hot-swap デプロイとwatch
npx cdk deploy       # スタックをAWSにデプロイ
npx cdk diff         # デプロイ状態との差分確認
npx cdk synth        # CloudFormation テンプレート生成
npx cdk destroy      # デプロイ済みスタック削除
```

## 環境変数

### 必須環境変数
```bash
LINE_CHANNEL_ACCESS_TOKEN=<LINE Bot チャネルアクセストークン>
LINE_CHANNEL_SECRET=<LINE Bot チャネルシークレット>
TABLE_NAME=<DynamoDB テーブル名>（CDKが自動設定）
AWS_REGION=<AWS リージョン>（Lambda実行時自動設定）
```

## 今後の拡張可能性

### 機能拡張
- 支払い履歴の保存と表示
- 月次/年次レポート機能
- 複数ユーザーでの支出共有
- カテゴリのカスタマイズ
- 予算設定と通知機能

### 技術的改善
- GraphQL API 導入
- リアルタイム通知
- 機械学習による支出分析
- 外部家計簿アプリとの連携

## まとめ

LINE Bot SDK、AWS CDK、DynamoDBを活用した現代的なサーバーレスアーキテクチャで、ユーザーフレンドリーな支払い情報管理ボットを実装しました。段階的な機能追加により、単純なテキスト応答から高度な状態管理を持つインタラクティブなボットへと発展させることができました。