# コントリビューションガイド

ScrapyMCPプロジェクトへのコントリビューションをお考えいただき、ありがとうございます！

## 🤝 コントリビューション方法

### 1. 環境セットアップ

```bash
# リポジトリをフォーク後、クローン
git clone https://github.com/your-username/scrapy-mcp.git
cd scrapy-mcp

# 依存関係をインストール
npm install

# 開発環境でテスト
npm run dev
```

### 2. 開発フロー

1. **Issue確認**: 既存のIssueを確認するか、新しいIssueを作成
2. **ブランチ作成**: `git checkout -b feature/your-feature-name`
3. **開発**: コードを変更・追加
4. **テスト**: 動作確認とビルドテスト
5. **コミット**: 明確なコミットメッセージで変更を記録
6. **プッシュ**: `git push origin feature/your-feature-name`
7. **プルリクエスト**: GitHubでPRを作成

## 📝 コーディング規約

### TypeScript

- **型安全性**: `any`の使用を避け、適切な型定義を行う
- **命名規則**: camelCaseを使用
- **インターフェース**: 明確なインターフェース定義
- **エラーハンドリング**: 適切なtry-catch文の使用

### コードスタイル

```typescript
// ✅ 良い例
interface ScrapeOptions {
  url: string;
  selector?: string;
  timeout?: number;
}

async function scrapeWebsite(options: ScrapeOptions): Promise<string> {
  try {
    // 実装
    return result;
  } catch (error) {
    console.error('スクレイピングエラー:', error);
    throw error;
  }
}

// ❌ 悪い例
function scrape(url: any, sel?: any): any {
  // 型定義なし、エラーハンドリングなし
}
```

## 🧪 テスト

### 手動テスト

```bash
# ビルドテスト
npm run build

# 開発モードでの動作確認
npm run dev
```

### テスト項目

- [ ] TypeScriptコンパイルエラーなし
- [ ] 基本的なHTTPスクレイピング動作
- [ ] Puppeteerスクレイピング動作
- [ ] エラーハンドリング
- [ ] メモリリーク確認

## 📋 プルリクエストガイドライン

### PRタイトル

- `feat: 新機能の説明`
- `fix: バグ修正の説明`
- `docs: ドキュメント更新`
- `refactor: リファクタリング`
- `perf: パフォーマンス改善`

### PR説明

```markdown
## 変更内容
- 変更点1
- 変更点2

## テスト方法
1. 手順1
2. 手順2

## 関連Issue
Closes #123
```

## 🐛 バグ報告

### バグレポートテンプレート

```markdown
**バグの説明**
簡潔で明確なバグの説明

**再現手順**
1. '...'に移動
2. '....'をクリック
3. '....'まで下にスクロール
4. エラーを確認

**期待される動作**
何が起こるべきかの明確で簡潔な説明

**実際の動作**
実際に何が起こったかの説明

**環境**
- OS: [例: Windows 10]
- Node.js: [例: 18.17.0]
- ブラウザ: [例: Chrome 120]

**追加情報**
問題に関する他の情報やスクリーンショット
```

## 💡 機能要望

### 機能要望テンプレート

```markdown
**機能要望の説明**
欲しい機能の明確で簡潔な説明

**解決したい問題**
この機能要望に関連する問題の説明

**提案する解決策**
実装したい内容の明確で簡潔な説明

**代替案**
検討した代替解決策や機能の説明

**追加情報**
機能要望に関する他の情報やスクリーンショット
```

## 🔒 セキュリティ

セキュリティに関する問題を発見した場合は、公開のIssueではなく、直接メールでご連絡ください：

📧 security@example.com

## 📜 ライセンス

コントリビューションすることで、あなたの貢献がMITライセンスの下でライセンスされることに同意したものとみなされます。

## 🙏 謝辞

すべてのコントリビューターに感謝いたします！あなたの貢献がこのプロジェクトをより良いものにします。 