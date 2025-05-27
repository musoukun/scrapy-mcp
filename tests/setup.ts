// テストセットアップファイル
import { jest, afterEach } from "@jest/globals";

// タイムアウトを延長
jest.setTimeout(30000);

// コンソールログを制御
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
	// テスト中は一部のエラーログを抑制
	if (
		args[0]?.includes?.("スクレイピング開始") ||
		args[0]?.includes?.("スクレイピング完了") ||
		args[0]?.includes?.("一括スクレイピング")
	) {
		return;
	}
	originalConsoleError(...args);
};

// グローバル変数の初期化
global.fetch = global.fetch || require("node-fetch");

// テスト後のクリーンアップ
afterEach(() => {
	jest.clearAllMocks();
});

export {};
