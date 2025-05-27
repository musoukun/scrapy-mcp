#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	Tool,
	CallToolRequestSchema,
	ListToolsRequestSchema,
	CallToolResult,
	TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer";

// スクレイピング引数の型定義
interface ScrapeArgs {
	url: string;
	selector?: string;
	format?: "text" | "html";
}

// Puppeteerスクレイピング引数の型定義
interface PuppeteerScrapeArgs {
	url: string;
	selector?: string;
	format?: "text" | "html" | "screenshot";
	waitFor?: number;
	waitForSelector?: string;
	headless?: boolean;
	viewport?: {
		width: number;
		height: number;
	};
	actions?: Array<{
		type: "click" | "type" | "wait" | "scroll";
		selector?: string;
		text?: string;
		delay?: number;
	}>;
}

// グローバルブラウザインスタンス（再利用のため）
let globalBrowser: Browser | null = null;

// スクレイピングツールの定義
const SIMPLE_SCRAPE_TOOL: Tool = {
	name: "simple_scrape",
	description: `
シンプルなWebページスクレイピングツール

**使用例:**
URLからHTMLを取得し、テキスト内容を抽出します。
JavaScriptは実行されません（静的コンテンツのみ）。

引数:
- url: スクレイピングするURL（必須）
- selector: CSSセレクター（オプション、指定した要素のみ抽出）
- format: 出力形式 "text" または "html" （デフォルト: "text"）
`,
	inputSchema: {
		type: "object",
		properties: {
			url: {
				type: "string",
				description: "スクレイピングするURL",
			},
			selector: {
				type: "string",
				description: "CSSセレクター（オプション）",
			},
			format: {
				type: "string",
				enum: ["text", "html"],
				default: "text",
				description: "出力形式",
			},
		},
		required: ["url"],
	},
};

// Puppeteerスクレイピングツールの定義
const PUPPETEER_SCRAPE_TOOL: Tool = {
	name: "puppeteer_scrape",
	description: `
Puppeteerを使用した高機能スクレイピングツール

**特徴:**
- JavaScriptを実行して動的コンテンツを取得
- スクリーンショット撮影機能
- クリック、入力などの操作が可能
- SPAやAjaxコンテンツに対応

**引数:**
- url: スクレイピングするURL（必須）
- selector: CSSセレクター（オプション）
- format: 出力形式 "text", "html", "screenshot"
- waitFor: 待機時間（ミリ秒）
- waitForSelector: 特定要素の読み込みを待つ
- headless: ヘッドレスモード（デフォルト: true）
- viewport: ビューポートサイズ
- actions: 実行するアクションのリスト
`,
	inputSchema: {
		type: "object",
		properties: {
			url: {
				type: "string",
				description: "スクレイピングするURL",
			},
			selector: {
				type: "string",
				description: "CSSセレクター（オプション）",
			},
			format: {
				type: "string",
				enum: ["text", "html", "screenshot"],
				default: "text",
				description: "出力形式",
			},
			waitFor: {
				type: "number",
				description: "待機時間（ミリ秒）",
			},
			waitForSelector: {
				type: "string",
				description: "特定要素の読み込みを待つ",
			},
			headless: {
				type: "boolean",
				default: true,
				description: "ヘッドレスモード",
			},
			viewport: {
				type: "object",
				properties: {
					width: { type: "number", default: 1280 },
					height: { type: "number", default: 720 },
				},
				description: "ビューポートサイズ",
			},
			actions: {
				type: "array",
				items: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: ["click", "type", "wait", "scroll"],
						},
						selector: { type: "string" },
						text: { type: "string" },
						delay: { type: "number" },
					},
					required: ["type"],
				},
				description: "実行するアクションのリスト",
			},
		},
		required: ["url"],
	},
};

// MCPサーバーの初期化
const server = new Server(
	{
		name: "simple-scraper-mcp",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	}
);

// ツール一覧の返却
server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [SIMPLE_SCRAPE_TOOL, PUPPETEER_SCRAPE_TOOL],
}));

// ツール実行の処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		if (name === "simple_scrape") {
			// 引数の型安全性を確保
			if (!args || typeof args !== "object") {
				throw new Error("引数が無効です");
			}
			return await handleSimpleScrape(args as unknown as ScrapeArgs);
		}

		if (name === "puppeteer_scrape") {
			if (!args || typeof args !== "object") {
				throw new Error("引数が無効です");
			}
			return await handlePuppeteerScrape(
				args as unknown as PuppeteerScrapeArgs
			);
		}

		return {
			content: [
				{ type: "text", text: `不明なツール: ${name}` } as TextContent,
			],
			isError: true,
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `エラー: ${
						error instanceof Error ? error.message : String(error)
					}`,
				} as TextContent,
			],
			isError: true,
		};
	}
});

// シンプルスクレイピングの実装
async function handleSimpleScrape(args: ScrapeArgs): Promise<CallToolResult> {
	if (!args || !args.url) {
		throw new Error("URLが必要です");
	}

	const { url, selector, format = "text" } = args;

	console.error(`スクレイピング開始: ${url}`);

	try {
		// URLからHTMLを取得
		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();
		const $ = cheerio.load(html);

		let result: string;

		if (selector) {
			// セレクターが指定されている場合
			const elements = $(selector);
			if (elements.length === 0) {
				result = "セレクターに一致する要素が見つかりません";
			} else {
				if (format === "html") {
					result = elements.html() || "";
				} else {
					result = elements.text().trim();
				}
			}
		} else {
			// セレクターが指定されていない場合は全体を取得
			if (format === "html") {
				result = $.html() || "";
			} else {
				// 不要なタグを除去してテキストのみ抽出
				$("script, style, nav, footer, header").remove();
				result = $("body").text().replace(/\s+/g, " ").trim();
			}
		}

		console.error(`スクレイピング完了: ${result.length}文字`);

		return {
			content: [
				{
					type: "text",
					text: result || "コンテンツが見つかりません",
				} as TextContent,
			],
			isError: false,
		};
	} catch (error) {
		console.error(
			`スクレイピングエラー: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

// Puppeteerスクレイピングの実装
async function handlePuppeteerScrape(
	args: PuppeteerScrapeArgs
): Promise<CallToolResult> {
	if (!args || !args.url) {
		throw new Error("URLが必要です");
	}

	const {
		url,
		selector,
		format = "text",
		waitFor,
		waitForSelector,
		headless = true,
		viewport = { width: 1280, height: 720 },
		actions = [],
	} = args;

	console.error(`Puppeteerスクレイピング開始: ${url}`);

	let page: Page | null = null;

	try {
		// ブラウザの初期化（再利用）
		if (!globalBrowser) {
			console.error("ブラウザを起動中...");
			globalBrowser = await puppeteer.launch({
				headless,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});
		}

		// 新しいページを作成
		page = await globalBrowser.newPage();
		await page.setViewport(viewport);

		// ページに移動
		await page.goto(url, { waitUntil: "networkidle2" });

		// 特定の要素を待つ
		if (waitForSelector) {
			await page.waitForSelector(waitForSelector);
		}

		// 指定時間待機
		if (waitFor) {
			await new Promise((resolve) => setTimeout(resolve, waitFor));
		}

		// アクションを実行
		for (const action of actions) {
			await executeAction(page, action);
		}

		let result: string;

		if (format === "screenshot") {
			// スクリーンショットを撮影
			const screenshot = await page.screenshot({
				encoding: "base64",
				fullPage: true,
			});
			result = `data:image/png;base64,${screenshot}`;
		} else {
			// HTMLまたはテキストを取得
			if (selector) {
				const element = await page.$(selector);
				if (!element) {
					result = "セレクターに一致する要素が見つかりません";
				} else {
					if (format === "html") {
						result = await page.evaluate(
							(el) => el.outerHTML,
							element
						);
					} else {
						result = await page.evaluate(
							(el) => el.textContent || "",
							element
						);
					}
				}
			} else {
				if (format === "html") {
					result = await page.content();
				} else {
					result = await page.evaluate(
						() => document.body.textContent || ""
					);
				}
			}
		}

		console.error(`Puppeteerスクレイピング完了: ${result.length}文字`);

		return {
			content: [
				{
					type: "text",
					text: result || "コンテンツが見つかりません",
				} as TextContent,
			],
			isError: false,
		};
	} catch (error) {
		console.error(
			`Puppeteerスクレイピングエラー: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	} finally {
		// ページのクリーンアップ（ブラウザは再利用のためそのまま）
		if (page) {
			await page.close();
		}
	}
}

// アクション実行の補助関数
async function executeAction(
	page: Page,
	action: NonNullable<PuppeteerScrapeArgs["actions"]>[number]
): Promise<void> {
	switch (action.type) {
		case "click":
			if (!action.selector) {
				throw new Error("clickアクションにはselectorが必要です");
			}
			await page.click(action.selector);
			if (action.delay) {
				await new Promise((resolve) =>
					setTimeout(resolve, action.delay)
				);
			}
			break;

		case "type":
			if (!action.selector || !action.text) {
				throw new Error("typeアクションにはselectorとtextが必要です");
			}
			await page.type(action.selector, action.text);
			if (action.delay) {
				await new Promise((resolve) =>
					setTimeout(resolve, action.delay)
				);
			}
			break;

		case "wait":
			const waitTime = action.delay || 1000;
			await new Promise((resolve) => setTimeout(resolve, waitTime));
			break;

		case "scroll":
			await page.evaluate(() => {
				window.scrollTo(0, document.body.scrollHeight);
			});
			if (action.delay) {
				await new Promise((resolve) =>
					setTimeout(resolve, action.delay)
				);
			}
			break;

		default:
			throw new Error(
				`未対応のアクションタイプ: ${(action as any).type}`
			);
	}
}

// サーバーの起動
async function main(): Promise<void> {
	try {
		console.error("Simple Scraper MCP サーバーを起動中...");

		const transport = new StdioServerTransport();
		await server.connect(transport);

		console.error("Simple Scraper MCP サーバーが正常に起動しました");

		// 終了シグナルのハンドリング
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);
		process.on("exit", cleanup);
	} catch (error) {
		console.error("サーバー起動エラー:", error);
		await cleanup();
		process.exit(1);
	}
}

// クリーンアップ処理
async function cleanup(): Promise<void> {
	if (globalBrowser) {
		console.error("ブラウザを終了中...");
		try {
			await globalBrowser.close();
			globalBrowser = null;
			console.error("ブラウザを正常に終了しました");
		} catch (error) {
			console.error("ブラウザ終了エラー:", error);
		}
	}
}

main();
