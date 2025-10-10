# Passkeyログイン自動提案機能の実装

## 問題の概要
passkeyログイン時に、既に対応するパスキーがデバイス（Keychain）に登録されている場合、自動的にそれを提案するように修正が必要でした。

## 実装内容

### 変更ファイル
- `frontend/src/hooks/useAuthChallenge.ts`（8行追加、4行削除）

### 変更の詳細
`normalizeRequestOptions` 関数内の `allowCredentials` の処理を以下のように変更しました：

**変更前:**
```typescript
const allowCredentials = publicKey.allowCredentials?.map((credential) => ({
  ...credential,
  id: ensureBase64URL(credential.id),
}));
```

**変更後:**
```typescript
// 空の場合はundefinedにすることで、発見可能な認証情報モードを有効化
const allowCredentials =
  publicKey.allowCredentials && publicKey.allowCredentials.length > 0
    ? publicKey.allowCredentials.map((credential) => ({
        ...credential,
        id: ensureBase64URL(credential.id),
      }))
    : undefined;
```

## 技術的な説明

### 問題の原因
WebAuthn仕様では、`allowCredentials` の値によって以下のような動作の違いがあります：

- `allowCredentials: undefined` → ブラウザはドメインに登録されている全てのパスキーを検索・表示 ✅
- `allowCredentials: []` → ブラウザは「認証情報が許可されていない」と解釈 ❌
- `allowCredentials: [id1, id2, ...]` → ブラウザは指定された認証情報のみを表示 ✅

AWS Cognitoが空の配列 `[]` を返す場合、ブラウザはパスキーを検索せず、ユーザーは自動提案を受けられませんでした。

### 解決方法
空の `allowCredentials` 配列を `undefined` に変換することで、ブラウザの「発見可能な認証情報モード」を有効化しました。これにより、ブラウザはドメインに登録されている全てのパスキーを自動的に検索し、ユーザーに提案します。

## 動作フロー

### ユーザー操作
1. ログインページでメールアドレスを入力
2. 「Passkeyでログイン」ボタンをクリック
3. ブラウザが自動的に利用可能なパスキーを表示
4. Touch ID / Face ID / Windows Hello などで認証
5. ログイン完了 🎉

### 内部処理
1. `authenticateWithPasskey()` が呼ばれる
2. サーバー側で `startPasskeyAuth()` が実行される
3. AWS Cognito が WEB_AUTHN チャレンジを返す
4. チャレンジには `allowCredentials: []` が含まれる場合がある
5. **修正箇所**: `normalizeRequestOptions()` が空配列を `undefined` に変換
6. `startAuthentication()` が正規化されたオプションで実行される
7. ブラウザが利用可能な全てのパスキーを検索
8. ユーザーに認証情報の選択肢を表示

## プラットフォーム別の動作

### macOS / iOS (Safari / Chrome)
- Touch ID または Face ID のプロンプトが表示される
- 登録済みのパスキーが自動的に提案される

### Windows (Edge / Chrome)
- Windows Hello のプロンプトが表示される
- 顔認証、指紋認証、またはPINでの認証が可能

### Android (Chrome)
- 指紋認証または画面ロックのプロンプトが表示される
- 登録済みのパスキーが自動的に提案される

## テスト方法

1. **パスキーの登録**
   - メールアドレスとパスワードでログイン
   - ログイン成功後に表示される「Passkeyを登録」ボタンをクリック
   - パスキー登録フローを完了する

2. **ログアウト**
   - アプリケーションからログアウトする

3. **パスキーログインの確認**
   - ログインページでメールアドレスを入力
   - 「Passkeyでログイン」ボタンをクリック
   - ブラウザが自動的にパスキーを提案することを確認
   - Touch ID / Face ID / Windows Hello で認証
   - ログインが成功することを確認

## 期待される動作

### 修正前
- 「Passkeyを使用」という汎用的なダイアログが表示される
- 具体的な認証情報の提案がない
- または認証が失敗する場合がある

### 修正後
- 登録済みのパスキーが自動的に表示される
- ユーザーはすぐに自分の認証情報を選択できる
- スムーズな認証体験が提供される

## 後方互換性
この変更は既存の動作を維持します：

- Cognitoが特定の認証情報IDを送信する場合は、それらが適切に使用される
- 空の配列またはフィールドの省略時は、undefinedに変換して検出モードを有効化
- 既存のパスキー認証フローはすべて正常に動作する

## 追加リソース

### 詳細ドキュメント
- `PASSKEY_AUTOFILL.md`: 技術的な詳細説明（英語）
- `PASSKEY_FLOW_DIAGRAM.md`: フロー図とプラットフォーム別UI例（英語）

### 参考リンク
- [WebAuthn仕様 - PublicKeyCredentialRequestOptions](https://www.w3.org/TR/webauthn-2/#dictdef-publickeycredentialrequestoptions)
- [発見可能な認証情報](https://www.w3.org/TR/webauthn-2/#client-side-discoverable-credential)
- [AWS Cognito Passkeyドキュメント](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-passkeys.html)
