# GitHub Actions ワークフロー

## AWS CDK デプロイワークフロー

このディレクトリには、AWS CDKを使用してLINE Botをデプロイするための GitHub Actions ワークフローが含まれています。

### ワークフロー: `deploy.yml`

#### トリガー条件

- `main` ブランチへのプッシュ
- 手動実行 (workflow_dispatch)

#### 実行内容

1. **コードのチェックアウト**
2. **Node.js 22 のセットアップ** - プロジェクトの要件に合わせた最新のNode.jsバージョン
3. **依存関係のインストール** - `npm ci` で確実なインストール
4. **TypeScriptの型チェック** - `npm run build` でコンパイルエラーを検出
5. **テストの実行** - `npm run test` で品質を保証
6. **AWSクレデンシャルの設定** - OIDC認証を使用した安全な認証
7. **CDKデプロイ** - `npm run cdk` で全スタックをデプロイ

### 必要なシークレット設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定してください：

#### AWS関連

- `AWS_ROLE_TO_ASSUME`: AWSのIAMロールARN（例: `arn:aws:iam::123456789012:role/GitHubActionsRole`）
- `AWS_REGION`: デプロイ先のAWSリージョン（例: `ap-northeast-1`）

#### LINE Bot関連

- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Botのチャネルアクセストークン
- `LINE_CHANNEL_SECRET`: LINE Botのチャネルシークレット

### AWS IAMロールの設定

GitHub Actions からAWSにアクセスするには、OIDC（OpenID Connect）を使用したIAMロールを設定する必要があります。

#### 信頼ポリシーの例

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:mannjaro/line-bot-sample:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

#### 必要な権限

IAMロールには以下の権限が必要です：

- CloudFormation の作成・更新・削除
- Lambda 関数の作成・更新・削除
- API Gateway の作成・更新・削除
- IAM ロールの作成・更新（CDKブートストラップ用）
- S3 バケットへのアクセス（CDKアセット用）
- CloudWatch Logs の作成・更新
- DynamoDB テーブルの作成・更新
- Cognito ユーザープールの作成・更新

### 手動実行

ワークフローは GitHub の Actions タブから手動で実行することもできます：

1. リポジトリの **Actions** タブに移動
2. 左側のワークフロー一覧から **Deploy AWS CDK** を選択
3. **Run workflow** ボタンをクリック
4. ブランチを選択して **Run workflow** を実行

### トラブルシューティング

#### テストが失敗する場合

- ローカルで `npm run test` を実行して、テストが通ることを確認してください
- 一部のテストが不安定な場合は、ワークフローの test ステップを一時的にコメントアウトすることも可能です

#### AWS認証エラー

- `AWS_ROLE_TO_ASSUME` と `AWS_REGION` が正しく設定されているか確認
- IAMロールの信頼ポリシーがGitHub Actionsからのアクセスを許可しているか確認
- AWS OIDCプロバイダーが正しく設定されているか確認

#### CDKデプロイエラー

- LINE Botのシークレットが正しく設定されているか確認
- CDKブートストラップが完了しているか確認（初回のみ必要）: `npx cdk bootstrap aws://ACCOUNT-ID/REGION`
