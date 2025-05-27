# 🚀 Advanced Scraper MCP

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

**高機能なWebスクレイピングMCPサーバー** - Model Context Protocol (MCP) 対応

基本的なHTTPスクレイピングから、JavaScript実行が必要な動的サイトまで対応した、TypeScript製の高性能スクレイピングツールです。

## ✨ 特徴

### 🔧 Simple Scrape
- ⚡ **高速軽量**: 基本的なHTTPリクエストベース
- 📄 **静的コンテンツ**: HTML/CSS/テキスト抽出
- 🎯 **CSSセレクター**: 精密な要素抽出
- 🛡️ **型安全**: TypeScript完全対応

### 🚀 Puppeteer Scrape
- 🌐 **JavaScript実行**: 動的コンテンツ完全対応
- 📱 **SPA対応**: React/Vue/Angularアプリ
- 📸 **スクリーンショット**: 高品質画像キャプチャ
- 🖱️ **インタラクション**: クリック・入力・スクロール
- ⏱️ **待機制御**: 要素・時間ベース待機
- 🔒 **プロキシ対応**: HTTP/HTTPS/SOCKS プロキシサポート

### 📦 Batch Scrape
- 🔄 **一括処理**: 複数URLの同時スクレイピング
- ⚡ **並行制御**: カスタマイズ可能な同時実行数
- 🔁 **リトライ機能**: 自動エラー回復
- ⏱️ **レート制限**: リクエスト間隔の調整
- 📊 **進捗表示**: リアルタイム処理状況

## 🚀 クイックスタート

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-username/advanced-scraper-mcp.git
cd advanced-scraper-mcp

# 依存関係をインストール
npm install

# TypeScriptをビルド
npm run build
```

### 基本的な使用方法

```bash
# 開発モード（ファイル監視）
npm run dev

# 本番モード
npm start
```

## 🔧 Claude Desktop 設定

Claude Desktop の設定ファイルに以下を追加：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "advanced-scraper": {
      "command": "node",
      "args": ["path/to/advanced-scraper-mcp/dist/index.js"]
    }
  }
}
```

## 📖 使用例

### 基本的なスクレイピング

```
simple_scrape を使用して https://example.com からテキストを取得
```

### 特定要素の抽出

```
simple_scrape でタイトルを取得:
- URL: https://news.ycombinator.com
- selector: .titleline > a
- format: text
```

### JavaScript必須サイト

```
puppeteer_scrape で動的コンテンツを取得:
- URL: https://spa-example.com
- waitFor: 3000
- format: text
```

### スクリーンショット撮影

```
puppeteer_scrape でスクリーンショット:
- URL: https://example.com
- format: screenshot
- viewport: { width: 1920, height: 1080 }
```

### フォーム操作

```
puppeteer_scrape でログイン:
- URL: https://example.com/login
- actions:
  - { type: "type", selector: "#username", text: "user" }
  - { type: "type", selector: "#password", text: "pass" }
  - { type: "click", selector: "#submit" }
- waitFor: 2000
```

### プロキシ使用

```
simple_scrape でプロキシ経由アクセス:
- URL: https://example.com
- proxy:
  - server: "proxy.example.com:8080"
  - username: "proxyuser"
  - password: "proxypass"
  - type: "http"
```

### 一括スクレイピング

```
batch_scrape で複数サイトを一括処理:
- urls: ["https://site1.com", "https://site2.com", "https://site3.com"]
- selector: "h1"
- concurrency: 3
- delay: 1000
- maxRetries: 2
- timeout: 30
```

## 🛠️ API リファレンス

### simple_scrape

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `url` | string | ✅ | スクレイピング対象URL |
| `selector` | string | ❌ | CSSセレクター |
| `format` | `"text"` \| `"html"` | ❌ | 出力形式（デフォルト: "text"） |

### puppeteer_scrape

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `url` | string | ✅ | スクレイピング対象URL |
| `selector` | string | ❌ | CSSセレクター |
| `format` | `"text"` \| `"html"` \| `"screenshot"` | ❌ | 出力形式 |
| `waitFor` | number | ❌ | 待機時間（ミリ秒） |
| `waitForSelector` | string | ❌ | 要素の読み込み待機 |
| `headless` | boolean | ❌ | ヘッドレスモード（デフォルト: true） |
| `viewport` | object | ❌ | ビューポートサイズ |
| `actions` | array | ❌ | 実行アクション |
| `proxy` | object | ❌ | プロキシ設定 |

### batch_scrape

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `urls` | string[] | ✅ | スクレイピング対象URL配列 |
| `selector` | string | ❌ | CSSセレクター |
| `format` | `"text"` \| `"html"` | ❌ | 出力形式 |
| `concurrency` | number | ❌ | 並行数（デフォルト: 3） |
| `delay` | number | ❌ | リクエスト間遅延（ミリ秒） |
| `maxRetries` | number | ❌ | 最大リトライ回数（デフォルト: 2） |
| `timeout` | number | ❌ | タイムアウト（秒） |
| `proxy` | object | ❌ | プロキシ設定 |

### アクション種類

| アクション | 必須パラメータ | オプション | 説明 |
|-----------|---------------|-----------|------|
| `click` | `selector` | `delay` | 要素をクリック |
| `type` | `selector`, `text` | `delay` | テキスト入力 |
| `wait` | - | `delay` | 時間待機 |
| `scroll` | - | `delay` | ページスクロール |

### プロキシ設定

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `server` | string | ✅ | プロキシサーバー（例: proxy.example.com:8080） |
| `username` | string | ❌ | 認証ユーザー名 |
| `password` | string | ❌ | 認証パスワード |
| `type` | `"http"` \| `"https"` \| `"socks4"` \| `"socks5"` | ❌ | プロキシタイプ（デフォルト: "http"） |

## 🏗️ 開発

### プロジェクト構造

```
advanced-scraper-mcp/
├── src/
│   └── index.ts          # メインソースコード
├── dist/                 # ビルド出力
│   ├── index.js
│   └── index.d.ts
├── package.json          # 依存関係・スクリプト
├── tsconfig.json         # TypeScript設定
├── LICENSE               # MITライセンス
└── README.md            # このファイル
```

### 利用可能なスクリプト

```bash
npm run build     # TypeScriptコンパイル
npm run dev       # 開発モード（ファイル監視）
npm start         # 本番モード
npm run clean     # ビルドファイル削除
```

### 開発環境要件

- **Node.js**: 18.0.0 以上
- **TypeScript**: 5.0 以上
- **OS**: Windows, macOS, Linux

## 🔒 セキュリティ

- ✅ サンドボックス化されたブラウザ実行
- ✅ 適切なUser-Agent設定
- ✅ リソース制限とタイムアウト
- ⚠️ 責任あるスクレイピングを心がけてください

## ⚠️ 制限事項

### Simple Scrape
- JavaScriptは実行されません
- 静的コンテンツのみ対応

### Puppeteer Scrape
- 高いリソース使用量
- 初回起動時のChromiumダウンロード
- 一部のCAPTCHA保護サイトでは制限あり

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🙏 謝辞

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCPフレームワーク
- [Puppeteer](https://pptr.dev/) - ブラウザ自動化
- [Cheerio](https://cheerio.js.org/) - サーバーサイドjQuery
- [TypeScript](https://www.typescriptlang.org/) - 型安全なJavaScript

## 📞 サポート

- 🐛 **バグ報告**: [Issues](https://github.com/your-username/advanced-scraper-mcp/issues)
- 💡 **機能要望**: [Issues](https://github.com/your-username/advanced-scraper-mcp/issues)
- 📧 **その他**: your.email@example.com

---

⭐ このプロジェクトが役に立った場合は、スターをつけていただけると嬉しいです！
