# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-19

### Added
- 🚀 **Puppeteer統合**: JavaScript実行対応の高度なスクレイピング機能
- 📸 **スクリーンショット機能**: 高品質な画像キャプチャ
- 🖱️ **インタラクティブ操作**: クリック、入力、スクロール機能
- ⏱️ **待機制御**: 要素・時間ベースの待機機能
- 🛡️ **TypeScript完全対応**: 型安全な実装
- 📱 **SPA対応**: React/Vue/Angularアプリケーション対応
- 🔧 **アクションシステム**: 複数操作の連続実行
- 🎯 **ビューポート制御**: カスタムサイズ設定
- 📦 **一括スクレイピング**: 複数URLの同時処理機能
- 🔒 **プロキシ対応**: HTTP/HTTPS/SOCKS プロキシサポート
- ⚡ **並行制御**: カスタマイズ可能な同時実行数
- 🔁 **リトライ機能**: 自動エラー回復システム
- ⏱️ **レート制限**: リクエスト間隔の調整機能

### Changed
- 📦 **プロジェクト名**: `simple-scraper-mcp` → `advanced-scraper-mcp`
- 🏗️ **アーキテクチャ**: JavaScript → TypeScript完全移行
- 📝 **API設計**: より直感的で柔軟なパラメータ構造
- 🔄 **ブラウザ管理**: 効率的なリソース再利用システム

### Enhanced
- ⚡ **パフォーマンス**: ブラウザインスタンスの再利用による高速化
- 🛡️ **エラーハンドリング**: より詳細で分かりやすいエラーメッセージ
- 📚 **ドキュメント**: 包括的なAPI仕様とサンプルコード
- 🔒 **セキュリティ**: サンドボックス化とリソース制限

## [1.0.0] - 2024-12-19

### Added
- 🔧 **基本スクレイピング**: HTTPベースの静的コンテンツ抽出
- 🎯 **CSSセレクター**: 精密な要素選択機能
- 📄 **フォーマット選択**: テキスト・HTML出力対応
- 🌐 **MCP統合**: Model Context Protocol完全対応
- ⚡ **高速処理**: Cheerioベースの軽量HTML解析

### Technical Details
- **Node.js**: 18.0.0+ サポート
- **Dependencies**: 
  - `@modelcontextprotocol/sdk`: ^1.0.0
  - `cheerio`: ^1.0.0
  - `node-fetch`: ^3.3.2
- **License**: MIT License

---

## 今後の予定

### [2.1.0] - 予定
- 🔄 **プロキシ対応**: 複数プロキシローテーション
- 📊 **レート制限**: 自動スロットリング機能
- 🧪 **テストスイート**: 自動テスト環境構築

### [2.2.0] - 予定
- 🤖 **AI統合**: 自動要素検出機能
- 📱 **モバイル対応**: デバイスエミュレーション
- 🔍 **検索機能**: 複数サイト横断検索

---

## サポート

- 🐛 **バグ報告**: [GitHub Issues](https://github.com/your-username/advanced-scraper-mcp/issues)
- 💡 **機能要望**: [GitHub Issues](https://github.com/your-username/advanced-scraper-mcp/issues)
- 📧 **その他**: your.email@example.com 