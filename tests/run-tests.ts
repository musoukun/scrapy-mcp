#!/usr/bin/env tsx
// テスト実行スクリプト
import { spawn } from "child_process";
import * as path from "path";

interface TestSuite {
	name: string;
	pattern: string;
	description: string;
}

const testSuites: TestSuite[] = [
	{
		name: "unit",
		pattern: "**/*.test.ts",
		description: "全てのユニットテスト",
	},
	{
		name: "batch",
		pattern: "**/batch-scraping.test.ts",
		description: "一括スクレイピングテスト",
	},
	{
		name: "proxy",
		pattern: "**/proxy-support.test.ts",
		description: "プロキシ対応テスト",
	},
	{
		name: "integration",
		pattern: "**/integration.test.ts",
		description: "統合テスト",
	},
];

function runCommand(command: string, args: string[]): Promise<number> {
	return new Promise((resolve, reject) => {
		console.log(`\n🚀 実行中: ${command} ${args.join(" ")}\n`);

		const child = spawn(command, args, {
			stdio: "inherit",
			shell: true,
			cwd: process.cwd(),
		});

		child.on("close", (code) => {
			if (code === 0) {
				console.log(`\n✅ コマンドが正常に完了しました\n`);
				resolve(code);
			} else {
				console.log(
					`\n❌ コマンドがエラーで終了しました (終了コード: ${code})\n`
				);
				resolve(code || 1);
			}
		});

		child.on("error", (error) => {
			console.error(`\n❌ コマンド実行エラー: ${error.message}\n`);
			reject(error);
		});
	});
}

async function runTests() {
	const args = process.argv.slice(2);
	const suiteName = args[0];

	console.log("🧪 Advanced Scraper MCP - テストスイート");
	console.log("=====================================\n");

	// 利用可能なテストスイートを表示
	if (!suiteName || suiteName === "--help" || suiteName === "-h") {
		console.log("利用可能なテストスイート:");
		testSuites.forEach((suite) => {
			console.log(`  ${suite.name.padEnd(12)} - ${suite.description}`);
		});
		console.log("\n使用方法:");
		console.log("  npm run test              # 全てのテストを実行");
		console.log(
			"  npm run test:batch        # 一括スクレイピングテストのみ"
		);
		console.log("  npm run test:proxy        # プロキシ対応テストのみ");
		console.log("  npm run test:coverage     # カバレッジ付きでテスト実行");
		console.log("  tsx tests/run-tests.ts batch  # 直接実行");
		return;
	}

	// 指定されたテストスイートを検索
	const suite = testSuites.find((s) => s.name === suiteName);
	if (!suite) {
		console.error(`❌ 不明なテストスイート: ${suiteName}`);
		console.log("\n利用可能なテストスイート:");
		testSuites.forEach((s) => {
			console.log(`  ${s.name}`);
		});
		process.exit(1);
	}

	console.log(`📋 実行するテストスイート: ${suite.description}`);
	console.log(`🎯 パターン: ${suite.pattern}\n`);

	try {
		// 依存関係のチェック
		console.log("📦 依存関係をチェック中...");
		await runCommand("npm", ["list", "--depth=0"]);

		// TypeScriptコンパイル
		console.log("🔨 TypeScriptをコンパイル中...");
		await runCommand("npm", ["run", "build"]);

		// テスト実行
		const jestArgs = [
			"--testPathPattern=" + suite.pattern,
			"--verbose",
			"--detectOpenHandles",
			"--forceExit",
		];

		if (args.includes("--coverage")) {
			jestArgs.push("--coverage");
		}

		if (args.includes("--watch")) {
			jestArgs.push("--watch");
		}

		const exitCode = await runCommand("npx", ["jest", ...jestArgs]);

		if (exitCode === 0) {
			console.log("🎉 全てのテストが成功しました！");
		} else {
			console.log("💥 一部のテストが失敗しました");
			process.exit(exitCode);
		}
	} catch (error) {
		console.error("❌ テスト実行中にエラーが発生しました:", error);
		process.exit(1);
	}
}

// メイン実行
if (require.main === module) {
	runTests().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}

export { runTests, testSuites };
