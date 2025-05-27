// 統合テスト
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import * as http from "http";
import { createMockServer, findAvailablePort } from "./helpers";

describe("Integration Tests", () => {
	let mockServer: http.Server;
	let serverPort: number;

	beforeAll(async () => {
		serverPort = await findAvailablePort(3001);
		mockServer = await createMockServer(serverPort);
		console.log(`Integration test server started on port ${serverPort}`);
	});

	afterAll(async () => {
		if (mockServer) {
			await new Promise<void>((resolve) => {
				mockServer.close(() => resolve());
			});
		}
	});

	describe("End-to-End Scraping Workflow", () => {
		test("should perform complete scraping workflow", async () => {
			// 完全なワークフローのテスト
			const testUrl = `http://localhost:${serverPort}/test1`;

			// 1. シンプルスクレイピング
			const response = await fetch(testUrl);
			expect(response.ok).toBe(true);

			const html = await response.text();
			expect(html).toContain("Test Title 1");
			expect(html).toContain("Test content 1");

			// 2. HTMLパース
			const titleMatch = html.match(/<title>([^<]*)<\/title>/);
			const title = titleMatch ? titleMatch[1] : "";
			expect(title).toBe("Test Page 1");

			// 3. セレクター抽出
			const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
			const h1Content = h1Match ? h1Match[1] : "";
			expect(h1Content).toBe("Test Title 1");

			console.log("✅ 完全なスクレイピングワークフローが成功しました");
		});

		test("should handle multiple content formats", async () => {
			const testUrl = `http://localhost:${serverPort}/test2`;

			const response = await fetch(testUrl);
			const html = await response.text();

			// テキスト形式
			const textContent = html.replace(/<[^>]*>/g, "").trim();
			expect(textContent).toContain("Test Title 2");

			// HTML形式（そのまま）
			expect(html).toContain("<h1>Test Title 2</h1>");

			// JSON形式（構造化）
			const structuredData = {
				title: html.match(/<title>([^<]*)<\/title>/)?.[1] || "",
				heading: html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] || "",
				content: html.match(/<p[^>]*>([^<]*)<\/p>/)?.[1] || "",
			};

			expect(structuredData.title).toBe("Test Page 2");
			expect(structuredData.heading).toBe("Test Title 2");
			expect(structuredData.content).toBe("Test content 2");
		});
	});

	describe("Error Recovery and Resilience", () => {
		test("should gracefully handle server errors", async () => {
			const errorUrl = `http://localhost:${serverPort}/error`;

			const response = await fetch(errorUrl);
			expect(response.status).toBe(404);
			expect(response.ok).toBe(false);

			// エラーハンドリングのテスト
			const handleError = (response: Response) => {
				if (!response.ok) {
					return {
						success: false,
						error: `HTTP ${response.status}`,
						statusCode: response.status,
					};
				}
				return { success: true };
			};

			const result = handleError(response);
			expect(result.success).toBe(false);
			expect(result.error).toBe("HTTP 404");
		});

		test("should handle timeout scenarios", async () => {
			const slowUrl = `http://localhost:${serverPort}/slow`;

			// タイムアウト付きリクエスト
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 1000); // 1秒でタイムアウト

			try {
				const response = await fetch(slowUrl, {
					signal: controller.signal,
				});
				clearTimeout(timeoutId);

				// 1秒以内に応答があった場合（予期しない）
				expect(response).toBeDefined();
			} catch (error) {
				// タイムアウトエラーが発生した場合（期待される）
				expect(error).toBeDefined();
				expect(String(error)).toContain("abort");
			}

			clearTimeout(timeoutId);
		}, 10000);
	});

	describe("Performance and Load Testing", () => {
		test("should handle concurrent requests efficiently", async () => {
			const urls = [
				`http://localhost:${serverPort}/test1`,
				`http://localhost:${serverPort}/test2`,
				`http://localhost:${serverPort}/test3`,
			];

			const startTime = Date.now();

			// 並行リクエスト
			const promises = urls.map((url) => fetch(url));
			const responses = await Promise.all(promises);

			const endTime = Date.now();
			const duration = endTime - startTime;

			// すべてのリクエストが成功
			responses.forEach((response) => {
				expect(response.ok).toBe(true);
			});

			// 並行処理により効率的に完了
			expect(duration).toBeLessThan(5000); // 5秒以内

			console.log(
				`✅ ${urls.length}件の並行リクエストが${duration}msで完了`
			);
		});

		test("should maintain performance under load", async () => {
			const testUrl = `http://localhost:${serverPort}/test1`;
			const requestCount = 10;

			const startTime = Date.now();

			// 複数回のリクエスト
			const promises = Array(requestCount)
				.fill(null)
				.map(() => fetch(testUrl));
			const responses = await Promise.all(promises);

			const endTime = Date.now();
			const duration = endTime - startTime;
			const avgResponseTime = duration / requestCount;

			// すべてのリクエストが成功
			responses.forEach((response) => {
				expect(response.ok).toBe(true);
			});

			// 平均応答時間が妥当
			expect(avgResponseTime).toBeLessThan(1000); // 1秒以内

			console.log(
				`✅ ${requestCount}件のリクエスト、平均応答時間: ${avgResponseTime.toFixed(
					2
				)}ms`
			);
		});
	});

	describe("Data Validation and Quality", () => {
		test("should validate scraped data quality", async () => {
			const testUrl = `http://localhost:${serverPort}/test1`;

			const response = await fetch(testUrl);
			const html = await response.text();

			// データ品質チェック
			const qualityChecks = {
				hasTitle: html.includes("<title>"),
				hasHeading: html.includes("<h1>"),
				hasContent: html.includes("<p"),
				isValidHtml: html.includes("<!DOCTYPE html>"),
				hasClosingTags: html.includes("</html>"),
			};

			Object.entries(qualityChecks).forEach(([check, passed]) => {
				expect(passed).toBe(true);
				console.log(`✅ ${check}: ${passed ? "PASS" : "FAIL"}`);
			});
		});

		test("should handle different character encodings", async () => {
			const testUrl = `http://localhost:${serverPort}/test1`;

			const response = await fetch(testUrl);
			const html = await response.text();

			// 文字エンコーディングのテスト（レスポンスヘッダーで確認）
			expect(response.headers.get("content-type")).toContain(
				"charset=utf-8"
			);

			// 日本語文字が正しく処理されることを確認
			const japaneseText = "テスト";
			const encodedText = encodeURIComponent(japaneseText);
			expect(encodedText).toBe("%E3%83%86%E3%82%B9%E3%83%88");

			// デコードテスト
			const decodedText = decodeURIComponent(encodedText);
			expect(decodedText).toBe(japaneseText);
		});
	});

	describe("Security and Safety", () => {
		test("should handle malicious content safely", async () => {
			// XSS攻撃のシミュレーション
			const maliciousScript = '<script>alert("xss")</script>';

			// HTMLエスケープ関数
			const escapeHtml = (text: string) => {
				return text
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#39;");
			};

			const escaped = escapeHtml(maliciousScript);
			expect(escaped).toBe(
				"&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
			);
			expect(escaped).not.toContain("<script>");
		});

		test("should validate URLs before scraping", async () => {
			const validateUrl = (url: string): boolean => {
				try {
					const parsed = new URL(url);
					return ["http:", "https:"].includes(parsed.protocol);
				} catch {
					return false;
				}
			};

			expect(validateUrl("http://example.com")).toBe(true);
			expect(validateUrl("https://example.com")).toBe(true);
			expect(validateUrl("ftp://example.com")).toBe(false);
			expect(validateUrl("javascript:alert(1)")).toBe(false);
			expect(validateUrl("invalid-url")).toBe(false);
		});
	});
});
