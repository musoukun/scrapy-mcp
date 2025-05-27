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
import { HttpsProxyAgent } from "https-proxy-agent";

// スクレイピング引数の型定義
interface ScrapeArgs {
	url: string;
	selector?: string;
	format?: "text" | "html";
	proxy?: ProxyConfig;
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
	proxy?: ProxyConfig;
}

// 一括スクレイピング引数の型定義
interface BatchScrapeArgs {
	urls: string[];
	selector?: string;
	format?: "text" | "html";
	concurrency?: number;
	delay?: number;
	maxRetries?: number;
	timeout?: number;
	proxy?: ProxyConfig;
}

// プロキシ設定の型定義
interface ProxyConfig {
	server: string;
	username?: string;
	password?: string;
	type?: "http" | "https" | "socks4" | "socks5";
}

// 一括スクレイピング結果の型定義
interface BatchResult {
	url: string;
	success: boolean;
	content?: string;
	error?: string;
	statusCode?: number;
	processedAt: string;
}

// グローバルブラウザインスタンス（再利用のため）
let globalBrowser: Browser | null = null;

// プロキシ設定を適用したfetchオプションを生成
function createFetchOptions(proxy?: ProxyConfig): any {
	const options: any = {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
		},
	};

	if (proxy) {
		// Node.jsのHTTPSプロキシ設定
		const proxyUrl =
			proxy.username && proxy.password
				? `${proxy.type || "http"}://${proxy.username}:${
						proxy.password
				  }@${proxy.server}`
				: `${proxy.type || "http"}://${proxy.server}`;

		// プロキシエージェントを設定（node-fetchの場合）
		options.agent = new HttpsProxyAgent(proxyUrl);
	}

	return options;
}

// Puppeteerのプロキシ設定を生成
function createPuppeteerProxyArgs(proxy?: ProxyConfig): string[] {
	const args = ["--no-sandbox", "--disable-setuid-sandbox"];

	if (proxy) {
		args.push(`--proxy-server=${proxy.server}`);
	}

	return args;
}

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
- proxy: プロキシ設定（オプション）
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
			proxy: {
				type: "object",
				properties: {
					server: {
						type: "string",
						description:
							"プロキシサーバー (例: proxy.example.com:8080)",
					},
					username: { type: "string", description: "認証ユーザー名" },
					password: { type: "string", description: "認証パスワード" },
					type: {
						type: "string",
						enum: ["http", "https", "socks4", "socks5"],
						default: "http",
						description: "プロキシタイプ",
					},
				},
				required: ["server"],
				description: "プロキシ設定",
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
- proxy: プロキシ設定（オプション）
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
			proxy: {
				type: "object",
				properties: {
					server: {
						type: "string",
						description:
							"プロキシサーバー (例: proxy.example.com:8080)",
					},
					username: { type: "string", description: "認証ユーザー名" },
					password: { type: "string", description: "認証パスワード" },
					type: {
						type: "string",
						enum: ["http", "https", "socks4", "socks5"],
						default: "http",
						description: "プロキシタイプ",
					},
				},
				required: ["server"],
				description: "プロキシ設定",
			},
		},
		required: ["url"],
	},
};

// 一括スクレイピングツールの定義
const BATCH_SCRAPE_TOOL: Tool = {
	name: "batch_scrape",
	description: `
一括スクレイピングツール

**特徴:**
- 複数URLの同時処理
- 並行数制御
- リトライ機能
- レート制限対応
- 進捗状況のリアルタイム表示

**引数:**
- urls: スクレイピングするURL配列（必須）
- selector: CSSセレクター（オプション）
- format: 出力形式 "text" または "html"
- concurrency: 並行数（デフォルト: 3）
- delay: リクエスト間の遅延（ミリ秒）
- maxRetries: 最大リトライ回数（デフォルト: 2）
- timeout: タイムアウト（秒）
- proxy: プロキシ設定（オプション）
`,
	inputSchema: {
		type: "object",
		properties: {
			urls: {
				type: "array",
				items: { type: "string" },
				description: "スクレイピングするURL配列",
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
			concurrency: {
				type: "number",
				default: 3,
				minimum: 1,
				maximum: 10,
				description: "並行数",
			},
			delay: {
				type: "number",
				default: 1000,
				description: "リクエスト間の遅延（ミリ秒）",
			},
			maxRetries: {
				type: "number",
				default: 2,
				minimum: 0,
				maximum: 5,
				description: "最大リトライ回数",
			},
			timeout: {
				type: "number",
				default: 30,
				description: "タイムアウト（秒）",
			},
			proxy: {
				type: "object",
				properties: {
					server: {
						type: "string",
						description:
							"プロキシサーバー (例: proxy.example.com:8080)",
					},
					username: { type: "string", description: "認証ユーザー名" },
					password: { type: "string", description: "認証パスワード" },
					type: {
						type: "string",
						enum: ["http", "https", "socks4", "socks5"],
						default: "http",
						description: "プロキシタイプ",
					},
				},
				required: ["server"],
				description: "プロキシ設定",
			},
		},
		required: ["urls"],
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
	tools: [SIMPLE_SCRAPE_TOOL, PUPPETEER_SCRAPE_TOOL, BATCH_SCRAPE_TOOL],
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

		if (name === "batch_scrape") {
			if (!args || typeof args !== "object") {
				throw new Error("引数が無効です");
			}
			return await handleBatchScrape(args as unknown as BatchScrapeArgs);
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

	const { url, selector, format = "text", proxy } = args;

	console.error(`スクレイピング開始: ${url}`);

	try {
		// URLからHTMLを取得
		const fetchOptions = createFetchOptions(proxy);
		const response = await fetch(url, fetchOptions);

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
		proxy,
	} = args;

	console.error(`Puppeteerスクレイピング開始: ${url}`);

	let page: Page | null = null;

	try {
		// ブラウザの初期化（再利用）
		if (!globalBrowser) {
			console.error("ブラウザを起動中...");
			const puppeteerArgs = createPuppeteerProxyArgs(proxy);
			globalBrowser = await puppeteer.launch({
				headless,
				args: puppeteerArgs,
			});
		}

		// 新しいページを作成
		page = await globalBrowser.newPage();
		await page.setViewport(viewport);

		// プロキシ認証を設定
		if (proxy && proxy.username && proxy.password) {
			await page.authenticate({
				username: proxy.username,
				password: proxy.password,
			});
		}

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

// 一括スクレイピングの実装
async function handleBatchScrape(
	args: BatchScrapeArgs
): Promise<CallToolResult> {
	if (
		!args ||
		!args.urls ||
		!Array.isArray(args.urls) ||
		args.urls.length === 0
	) {
		throw new Error("URLの配列が必要です");
	}

	const {
		urls,
		selector,
		format = "text",
		concurrency = 3,
		delay = 1000,
		maxRetries = 2,
		timeout = 30,
		proxy,
	} = args;

	console.error(`一括スクレイピング開始: ${urls.length}件のURL`);

	const results: BatchResult[] = [];
	const semaphore = new Semaphore(concurrency);

	// 並行処理でスクレイピングを実行
	const promises = urls.map(async (url, index) => {
		return semaphore.acquire(async () => {
			const startTime = Date.now();
			let retries = 0;

			while (retries <= maxRetries) {
				try {
					// 遅延を追加（最初のリクエスト以外）
					if (index > 0 && delay > 0) {
						await new Promise((resolve) =>
							setTimeout(resolve, delay)
						);
					}

					console.error(
						`処理中 (${index + 1}/${urls.length}): ${url}`
					);

					const controller = new AbortController();
					const timeoutId = setTimeout(
						() => controller.abort(),
						timeout * 1000
					);

					try {
						const fetchOptions = createFetchOptions(proxy);
						fetchOptions.signal = controller.signal;
						const response = await fetch(url, fetchOptions);

						clearTimeout(timeoutId);

						if (!response.ok) {
							throw new Error(
								`HTTP ${response.status}: ${response.statusText}`
							);
						}

						const html = await response.text();
						const $ = cheerio.load(html);

						let content: string;

						if (selector) {
							const elements = $(selector);
							if (elements.length === 0) {
								content =
									"セレクターに一致する要素が見つかりません";
							} else {
								if (format === "html") {
									content = elements.html() || "";
								} else {
									content = elements.text().trim();
								}
							}
						} else {
							if (format === "html") {
								content = $.html() || "";
							} else {
								$(
									"script, style, nav, footer, header"
								).remove();
								content = $("body")
									.text()
									.replace(/\s+/g, " ")
									.trim();
							}
						}

						const result: BatchResult = {
							url,
							success: true,
							content: content || "コンテンツが見つかりません",
							statusCode: response.status,
							processedAt: new Date().toISOString(),
						};

						results.push(result);
						console.error(
							`完了 (${index + 1}/${urls.length}): ${url} - ${
								content.length
							}文字`
						);
						return;
					} catch (fetchError) {
						clearTimeout(timeoutId);
						throw fetchError;
					}
				} catch (error) {
					retries++;
					const errorMessage =
						error instanceof Error ? error.message : String(error);

					if (retries <= maxRetries) {
						console.error(
							`リトライ ${retries}/${maxRetries}: ${url} - ${errorMessage}`
						);
						await new Promise((resolve) =>
							setTimeout(resolve, 1000 * retries)
						);
					} else {
						const result: BatchResult = {
							url,
							success: false,
							error: errorMessage,
							processedAt: new Date().toISOString(),
						};
						results.push(result);
						console.error(
							`失敗 (${index + 1}/${
								urls.length
							}): ${url} - ${errorMessage}`
						);
						return;
					}
				}
			}
		});
	});

	// すべての処理を待機
	await Promise.all(promises);

	// 結果をソート（元の順序を保持）
	results.sort((a, b) => urls.indexOf(a.url) - urls.indexOf(b.url));

	const successCount = results.filter((r) => r.success).length;
	const failureCount = results.length - successCount;

	console.error(
		`一括スクレイピング完了: 成功 ${successCount}件, 失敗 ${failureCount}件`
	);

	// 結果をフォーマット
	const summary = `一括スクレイピング結果:
成功: ${successCount}件
失敗: ${failureCount}件
合計: ${results.length}件

詳細結果:
${results
	.map((result, index) => {
		if (result.success) {
			return `${index + 1}. ✅ ${result.url}
   内容: ${result.content?.substring(0, 100)}${
				result.content && result.content.length > 100 ? "..." : ""
			}
   ステータス: ${result.statusCode}
   処理時刻: ${result.processedAt}`;
		} else {
			return `${index + 1}. ❌ ${result.url}
   エラー: ${result.error}
   処理時刻: ${result.processedAt}`;
		}
	})
	.join("\n\n")}`;

	return {
		content: [
			{
				type: "text",
				text: summary,
			} as TextContent,
		],
		isError: false,
	};
}

// セマフォクラス（並行数制御用）
class Semaphore {
	private permits: number;
	private queue: Array<() => void> = [];

	constructor(permits: number) {
		this.permits = permits;
	}

	async acquire<T>(task: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			const tryAcquire = () => {
				if (this.permits > 0) {
					this.permits--;
					task()
						.then(resolve)
						.catch(reject)
						.finally(() => {
							this.permits++;
							if (this.queue.length > 0) {
								const next = this.queue.shift();
								if (next) next();
							}
						});
				} else {
					this.queue.push(tryAcquire);
				}
			};
			tryAcquire();
		});
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
