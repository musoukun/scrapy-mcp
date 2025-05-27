# テストスイート

Advanced Scraper MCPの包括的なテストスイートです。

## 📋 テスト構成

### テストファイル

- **`batch-scraping.test.ts`** - 一括スクレイピング機能のテスト
- **`proxy-support.test.ts`** - プロキシ対応機能のテスト  
- **`integration.test.ts`** - 統合テスト
- **`helpers.ts`** - テスト用ヘルパー関数
- **`setup.ts`** - テスト環境セットアップ

### テスト種別

| テスト種別 | 説明 | ファイル |
|-----------|------|---------|
| **一括スクレイピング** | 複数URL同時処理、並行制御、エラーハンドリング | `batch-scraping.test.ts` |
| **プロキシ対応** | HTTP/SOCKS プロキシ、認証、設定検証 | `proxy-support.test.ts` |
| **統合テスト** | エンドツーエンド、パフォーマンス、セキュリティ | `integration.test.ts` |

## 🚀 テスト実行方法

### 基本的な実行

```bash
# 全てのテストを実行
npm test

# 特定のテストスイートのみ実行
npm run test:batch    # 一括スクレイピングテスト
npm run test:proxy    # プロキシ対応テスト

# カバレッジ付きで実行
npm run test:coverage

# ウォッチモードで実行
npm run test:watch
```

### 詳細な実行オプション

```bash
# 直接実行（カスタムオプション付き）
npx jest --testPathPattern="batch-scraping" --verbose
npx jest --testPathPattern="proxy-support" --coverage
npx jest --testPathPattern="integration" --detectOpenHandles

# 特定のテストケースのみ実行
npx jest --testNamePattern="should scrape multiple URLs"
npx jest --testNamePattern="proxy"
```

## 🧪 テスト内容詳細

### 一括スクレイピングテスト

#### 基本機能テスト
- ✅ 複数URL同時スクレイピング
- ✅ 成功・失敗の混在処理
- ✅ 並行数制御（セマフォ）
- ✅ レスポンス時間測定

#### エラーハンドリング
- ✅ ネットワークエラー処理
- ✅ タイムアウト処理
- ✅ 空URL配列の処理
- ✅ 無効URLの処理

#### パフォーマンステスト
- ✅ 並行処理効率
- ✅ メモリ使用量
- ✅ 処理時間制限

### プロキシ対応テスト

#### プロキシ設定
- ✅ HTTP/HTTPSプロキシ
- ✅ SOCKS4/SOCKS5プロキシ
- ✅ 認証情報設定
- ✅ 設定検証

#### 認証テスト
- ✅ Basic認証ヘッダー生成
- ✅ 特殊文字を含む認証情報
- ✅ 認証失敗処理
- ✅ 無効な認証情報

#### Puppeteer連携
- ✅ プロキシ引数生成
- ✅ 認証設定
- ✅ 接続エラー処理

### 統合テスト

#### エンドツーエンド
- ✅ 完全なスクレイピングワークフロー
- ✅ 複数コンテンツ形式対応
- ✅ データ品質検証
- ✅ 文字エンコーディング

#### パフォーマンス
- ✅ 並行リクエスト処理
- ✅ 負荷テスト
- ✅ 応答時間測定
- ✅ リソース使用量

#### セキュリティ
- ✅ XSS攻撃対策
- ✅ URL検証
- ✅ HTMLエスケープ
- ✅ 悪意のあるコンテンツ処理

## 🛠️ テスト環境

### 依存関係

```json
{
  "jest": "^29.7.0",
  "ts-jest": "^29.1.0",
  "@types/jest": "^29.5.0",
  "nock": "^13.4.0",
  "proxy": "^2.1.1"
}
```

### モックサーバー

テストでは以下のモックサーバーを使用：

- **HTTPサーバー** - テスト用コンテンツ配信
- **プロキシサーバー** - プロキシ機能テスト
- **遅延サーバー** - タイムアウトテスト

### ポート管理

- 動的ポート割り当て（3001番から検索）
- ポート競合回避
- テスト後の自動クリーンアップ

## 📊 カバレッジ目標

| 項目 | 目標 | 現在 |
|------|------|------|
| **行カバレッジ** | 90%+ | - |
| **関数カバレッジ** | 95%+ | - |
| **分岐カバレッジ** | 85%+ | - |

## 🐛 トラブルシューティング

### よくある問題

#### ポート競合エラー
```bash
Error: listen EADDRINUSE :::3001
```
**解決方法**: 他のプロセスがポートを使用している場合は自動的に別のポートを使用します。

#### タイムアウトエラー
```bash
Timeout - Async callback was not invoked within the 5000 ms timeout
```
**解決方法**: `jest.setTimeout(30000)` でタイムアウトを延長済み。

#### メモリリーク警告
```bash
Jest detected open handles
```
**解決方法**: `--detectOpenHandles --forceExit` オプションで対応済み。

### デバッグ方法

```bash
# 詳細ログ付きで実行
DEBUG=* npm test

# 特定のテストのみデバッグ
npx jest --testNamePattern="specific test" --verbose

# Node.jsデバッガーで実行
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📝 テスト追加ガイド

### 新しいテストの追加

1. **テストファイル作成**
   ```typescript
   // tests/new-feature.test.ts
   import { describe, test, expect } from '@jest/globals';
   
   describe('New Feature Tests', () => {
     test('should work correctly', () => {
       expect(true).toBe(true);
     });
   });
   ```

2. **ヘルパー関数の利用**
   ```typescript
   import { createMockServer, findAvailablePort } from './helpers.js';
   ```

3. **テストスイートに追加**
   ```typescript
   // tests/run-tests.ts に追加
   {
     name: 'new-feature',
     pattern: '**/new-feature.test.ts',
     description: '新機能のテスト'
   }
   ```

### テストのベストプラクティス

- **独立性**: 各テストは他のテストに依存しない
- **クリーンアップ**: リソースの適切な解放
- **モック**: 外部依存関係のモック化
- **アサーション**: 明確で具体的な検証
- **ドキュメント**: テストの目的と期待値を明記

## 🔄 CI/CD統合

### GitHub Actions設定例

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### 継続的品質管理

- **自動テスト実行**: プッシュ・プルリクエスト時
- **カバレッジ監視**: Codecov連携
- **パフォーマンス監視**: ベンチマーク結果の追跡
- **セキュリティスキャン**: 依存関係の脆弱性チェック 