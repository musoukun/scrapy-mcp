# Advanced Scraper MCP サーバー

無料のWebスクレイピングMCPサーバーです。基本的なHTTPスクレイピングとPuppeteerによる高度なスクレイピングに対応しています。

## 機能

### 🔧 simple_scrape
- 基本的なHTTPスクレイピング
- 高速で軽量
- 静的コンテンツに最適
- CSSセレクターでの要素抽出

### 🚀 puppeteer_scrape
- JavaScript実行対応
- SPA（Single Page Application）対応
- スクリーンショット撮影
- インタラクティブ操作（クリック、入力など）
- 動的コンテンツの取得

## インストール

```powershell
cd D:\simple-scraper-mcp
npm install
npm run build
```

## 使用方法

### スタンドアロンで実行
```powershell
npm start
```

### 開発モード
```powershell
npm run dev
```

### Claude Desktop での設定

Claude Desktop の設定ファイル（`%APPDATA%\Claude\claude_desktop_config.json`）に以下を追加：

```json
{
  "mcpServers": {
    "advanced-scraper": {
      "command": "node",
      "args": ["D:\\simple-scraper-mcp\\dist\\index.js"]
    }
  }
}
```

## 使用例

### 基本的なスクレイピング
```
simple_scrape を使用して https://example.com からテキストを取得
```

### JavaScript実行が必要なサイト
```
puppeteer_scrape を使用して動的なコンテンツを取得:
- URL: https://spa-example.com
- waitFor: 3000 (3秒待機)
- format: text
```

### スクリーンショット撮影
```
puppeteer_scrape でスクリーンショットを撮影:
- URL: https://example.com
- format: screenshot
- viewport: width: 1920, height: 1080
```

### インタラクティブ操作
```
puppeteer_scrape でフォーム入力:
- URL: https://example.com/form
- actions:
  - type: "type", selector: "#username", text: "testuser"
  - type: "type", selector: "#password", text: "password"
  - type: "click", selector: "#submit"
- waitFor: 2000
```

## 制限事項

### simple_scrape
- JavaScriptは実行されません
- 静的コンテンツのみ

### puppeteer_scrape
- リソース使用量が多い
- 初回起動時にChromiumのダウンロードが必要
- 一部のCAPTCHA保護サイトでは動作しない場合があります

## 技術仕様

- **Node.js**: 18.0.0 以上
- **TypeScript**: 型安全な実装
- **Puppeteer**: 最新のChromiumエンジン
- **Cheerio**: 高速なHTML解析
- **MCP SDK**: Model Context Protocol 対応

## ライセンス

MIT License - 商用利用可能

## トラブルシューティング

### Puppeteerでエラーが発生する場合
```powershell
# Chromiumの手動インストール
npx puppeteer browsers install chrome
```

### メモリ不足の場合
- `headless: true` を使用してヘッドレスモードで実行
- 不要なページは速やかに閉じる
- 大量のページを処理する場合は適切な間隔を設ける
