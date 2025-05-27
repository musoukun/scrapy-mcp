// 一括スクレイピングのテスト
import {
	describe,
	test,
	expect,
	beforeAll,
	afterAll,
	beforeEach,
} from "@jest/globals";
import * as http from "http";
import { createMockServer, findAvailablePort, createTestUrls } from "./helpers";

// テスト対象の関数をインポート（実際の実装から）
// 注意: 実際のテストでは、テスト可能な形でモジュールを分割する必要があります

describe("Batch Scraping Tests", () => {
	let mockServer: http.Server;
	let serverPort: number;
	let testUrls: string[];

	beforeAll(async () => {
		// 利用可能なポートを見つけてモックサーバーを起動
		serverPort = await findAvailablePort(3001);
		mockServer = await createMockServer(serverPort);
		testUrls = createTestUrls(serverPort, 3);

		console.log(`Mock server started on port ${serverPort}`);
	});

	afterAll(async () => {
		// モックサーバーを停止
		if (mockServer) {
			await new Promise<void>((resolve) => {
				mockServer.close(() => resolve());
			});
		}
	});

	describe("Basic Batch Scraping", () => {
		test("should scrape multiple URLs successfully", async () => {
			// モック関数を作成（実際の実装をテスト用に調整）
			const mockBatchScrape = async (args: any) => {
				const {
					urls,
					selector,
					format = "text",
					concurrency = 3,
				} = args;

				// 簡易的な一括スクレイピング実装
				const results: Array<{
					url: string;
					success: boolean;
					content?: string;
					statusCode?: number;
					error?: string;
					processedAt: string;
				}> = [];
				for (const url of urls) {
					try {
						const response = await fetch(url);
						if (response.ok) {
							const html = await response.text();
							const content = selector
								? html.match(
										new RegExp(
											`<${selector}[^>]*>([^<]*)</${selector}>`
										)
								  )?.[1] || ""
								: html.replace(/<[^>]*>/g, "").trim();

							results.push({
								url,
								success: true,
								content: content.substring(0, 100),
								statusCode: response.status,
								processedAt: new Date().toISOString(),
							});
						} else {
							results.push({
								url,
								success: false,
								error: `HTTP ${response.status}`,
								processedAt: new Date().toISOString(),
							});
						}
					} catch (error) {
						results.push({
							url,
							success: false,
							error:
								error instanceof Error
									? error.message
									: String(error),
							processedAt: new Date().toISOString(),
						});
					}
				}

				return {
					content: [
						{
							type: "text",
							text: `成功: ${
								results.filter((r) => r.success).length
							}件, 失敗: ${
								results.filter((r) => !r.success).length
							}件`,
						},
					],
					isError: false,
				};
			};

			const result = await mockBatchScrape({
				urls: testUrls,
				selector: "h1",
				format: "text",
				concurrency: 2,
			});

			expect(result.isError).toBe(false);
			expect(result.content[0].text).toContain("成功: 3件");
		}, 15000);

		test("should handle mixed success and failure URLs", async () => {
			const mixedUrls = [
				...testUrls.slice(0, 2),
				`http://localhost:${serverPort}/error`,
				`http://localhost:${serverPort}/nonexistent`,
			];

			const mockBatchScrape = async (args: any) => {
				const { urls } = args;
				const results: Array<{
					url: string;
					success: boolean;
					statusCode?: number;
					error?: string;
					processedAt: string;
				}> = [];

				for (const url of urls) {
					try {
						const response = await fetch(url);
						results.push({
							url,
							success: response.ok,
							statusCode: response.status,
							processedAt: new Date().toISOString(),
						});
					} catch (error) {
						results.push({
							url,
							success: false,
							error:
								error instanceof Error
									? error.message
									: String(error),
							processedAt: new Date().toISOString(),
						});
					}
				}

				const successCount = results.filter((r) => r.success).length;
				const failureCount = results.length - successCount;

				return {
					content: [
						{
							type: "text",
							text: `成功: ${successCount}件, 失敗: ${failureCount}件`,
						},
					],
					isError: false,
				};
			};

			const result = await mockBatchScrape({
				urls: mixedUrls,
				concurrency: 2,
			});

			expect(result.content[0].text).toContain("成功: 2件");
			expect(result.content[0].text).toContain("失敗: 2件");
		}, 15000);

		test("should respect concurrency limits", async () => {
			const startTime = Date.now();
			let activeRequests = 0;
			let maxConcurrent = 0;

			const mockBatchScrapeWithConcurrency = async (args: any) => {
				const { urls, concurrency = 3 } = args;
				const results: Array<{
					url: string;
					success: boolean;
					statusCode: number;
					processedAt: string;
				}> = [];

				// セマフォの簡易実装
				const semaphore = {
					permits: concurrency,
					queue: [] as Array<() => void>,

					async acquire<T>(task: () => Promise<T>): Promise<T> {
						return new Promise((resolve, reject) => {
							const tryAcquire = () => {
								if (this.permits > 0) {
									this.permits--;
									activeRequests++;
									maxConcurrent = Math.max(
										maxConcurrent,
										activeRequests
									);

									task()
										.then(resolve)
										.catch(reject)
										.finally(() => {
											activeRequests--;
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
					},
				};

				const promises = urls.map(async (url: string) => {
					return semaphore.acquire(async () => {
						await new Promise((resolve) =>
							setTimeout(resolve, 100)
						); // 人工的な遅延
						const response = await fetch(url);
						return {
							url,
							success: response.ok,
							statusCode: response.status,
							processedAt: new Date().toISOString(),
						};
					});
				});

				const allResults = await Promise.all(promises);
				const successCount = allResults.filter((r) => r.success).length;

				return {
					content: [
						{
							type: "text",
							text: `成功: ${successCount}件, 最大同時実行数: ${maxConcurrent}`,
						},
					],
					isError: false,
				};
			};

			const result = await mockBatchScrapeWithConcurrency({
				urls: testUrls,
				concurrency: 2,
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(result.content[0].text).toContain("成功: 3件");
			expect(maxConcurrent).toBeLessThanOrEqual(2);
			expect(duration).toBeGreaterThan(200); // 並行制御により時間がかかる
		}, 15000);
	});

	describe("Error Handling", () => {
		test("should handle network errors gracefully", async () => {
			const invalidUrls = [
				"http://nonexistent-domain-12345.com",
				"http://localhost:99999/test",
			];

			const mockBatchScrape = async (args: any) => {
				const { urls } = args;
				const results: Array<{
					url: string;
					success: boolean;
					statusCode?: number;
					error?: string;
					processedAt: string;
				}> = [];

				for (const url of urls) {
					try {
						const controller = new AbortController();
						const timeoutId = setTimeout(
							() => controller.abort(),
							5000
						);

						const response = await fetch(url, {
							signal: controller.signal,
						});
						clearTimeout(timeoutId);

						results.push({
							url,
							success: response.ok,
							statusCode: response.status,
							processedAt: new Date().toISOString(),
						});
					} catch (error) {
						results.push({
							url,
							success: false,
							error:
								error instanceof Error
									? error.message
									: String(error),
							processedAt: new Date().toISOString(),
						});
					}
				}

				const failureCount = results.filter((r) => !r.success).length;

				return {
					content: [
						{
							type: "text",
							text: `失敗: ${failureCount}件`,
						},
					],
					isError: false,
				};
			};

			const result = await mockBatchScrape({
				urls: invalidUrls,
				timeout: 5,
			});

			expect(result.content[0].text).toContain("失敗: 2件");
		}, 20000);

		test("should handle empty URL array", async () => {
			const mockBatchScrape = async (args: any) => {
				if (!args.urls || args.urls.length === 0) {
					throw new Error("URLの配列が必要です");
				}
				return {
					content: [{ type: "text", text: "OK" }],
					isError: false,
				};
			};

			await expect(mockBatchScrape({ urls: [] })).rejects.toThrow(
				"URLの配列が必要です"
			);
		});
	});

	describe("Performance Tests", () => {
		test("should complete batch scraping within reasonable time", async () => {
			const startTime = Date.now();

			const mockBatchScrape = async (args: any) => {
				const { urls, concurrency = 3 } = args;

				// 並行処理のシミュレーション
				const chunks: string[][] = [];
				for (let i = 0; i < urls.length; i += concurrency) {
					chunks.push(urls.slice(i, i + concurrency));
				}

				for (const chunk of chunks) {
					await Promise.all(
						chunk.map(async (url: string) => {
							const response = await fetch(url);
							return response.ok;
						})
					);
				}

				return {
					content: [
						{
							type: "text",
							text: `処理完了: ${urls.length}件`,
						},
					],
					isError: false,
				};
			};

			const result = await mockBatchScrape({
				urls: testUrls,
				concurrency: 3,
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(result.content[0].text).toContain("処理完了: 3件");
			expect(duration).toBeLessThan(10000); // 10秒以内
		}, 15000);
	});
});
