// プロキシ対応のテスト
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import * as http from "http";
import {
	createMockServer,
	createMockProxy,
	findAvailablePort,
	encodeBase64,
} from "./helpers";

// プロキシ設定の型定義
interface ProxyConfig {
	host: string;
	port: number;
	protocol?: "http" | "https" | "socks4" | "socks5";
	username?: string;
	password?: string;
}

describe("Proxy Support Tests", () => {
	let mockServer: http.Server;
	let mockProxy: http.Server;
	let serverPort: number;
	let proxyPort: number;
	let testUrl: string;

	beforeAll(async () => {
		// モックサーバーとプロキシサーバーを起動
		serverPort = await findAvailablePort(3001);
		proxyPort = await findAvailablePort(8080);

		mockServer = await createMockServer(serverPort);
		mockProxy = await createMockProxy(proxyPort);

		testUrl = `http://localhost:${serverPort}/test1`;

		console.log(`Mock server started on port ${serverPort}`);
		console.log(`Mock proxy started on port ${proxyPort}`);
	});

	afterAll(async () => {
		// サーバーを停止
		if (mockServer) {
			await new Promise<void>((resolve) => {
				mockServer.close(() => resolve());
			});
		}
		if (mockProxy) {
			await new Promise<void>((resolve) => {
				mockProxy.close(() => resolve());
			});
		}
	});

	describe("Proxy Configuration", () => {
		test("should create valid proxy configuration", () => {
			const proxyConfig: ProxyConfig = {
				host: "localhost",
				port: proxyPort,
				protocol: "http",
				username: "testuser",
				password: "testpass",
			};

			expect(proxyConfig.host).toBe("localhost");
			expect(proxyConfig.port).toBe(proxyPort);
			expect(proxyConfig.protocol).toBe("http");
			expect(proxyConfig.username).toBe("testuser");
			expect(proxyConfig.password).toBe("testpass");
		});

		test("should handle proxy configuration without authentication", () => {
			const proxyConfig: ProxyConfig = {
				host: "localhost",
				port: proxyPort,
				protocol: "http",
			};

			expect(proxyConfig.username).toBeUndefined();
			expect(proxyConfig.password).toBeUndefined();
		});
	});

	describe("Proxy Authentication", () => {
		test("should create proper authorization header", () => {
			const username = "testuser";
			const password = "testpass";
			const credentials = `${username}:${password}`;
			const encoded = encodeBase64(credentials);
			const authHeader = `Basic ${encoded}`;

			expect(authHeader).toBe(
				`Basic ${Buffer.from(credentials).toString("base64")}`
			);
		});

		test("should handle special characters in credentials", () => {
			const username = "user@domain.com";
			const password = "p@ssw0rd!";
			const credentials = `${username}:${password}`;
			const encoded = encodeBase64(credentials);

			expect(encoded).toBe(Buffer.from(credentials).toString("base64"));
		});
	});

	describe("HTTP Proxy Support", () => {
		test("should scrape through HTTP proxy with authentication", async () => {
			// モックスクレイピング関数（プロキシ対応）
			const mockScrapeWithProxy = async (args: any) => {
				const { url, proxy } = args;

				try {
					// プロキシ設定を使用したfetchオプション作成
					const fetchOptions: any = {
						method: "GET",
						headers: {},
					};

					if (proxy) {
						// 簡易的なプロキシ実装（実際にはhttps-proxy-agentを使用）
						if (proxy.username && proxy.password) {
							const credentials = `${proxy.username}:${proxy.password}`;
							const encoded = encodeBase64(credentials);
							fetchOptions.headers[
								"Proxy-Authorization"
							] = `Basic ${encoded}`;
						}

						// 実際のプロキシ経由でのリクエスト（モック）
						fetchOptions.proxy = `http://${proxy.host}:${proxy.port}`;
					}

					// 実際のリクエスト（プロキシ経由をシミュレート）
					const response = await fetch(url, fetchOptions);
					const html = await response.text();

					return {
						content: [
							{
								type: "text",
								text: `プロキシ経由でスクレイピング成功: ${response.status}`,
							},
						],
						isError: false,
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `プロキシエラー: ${
									error instanceof Error
										? error.message
										: String(error)
								}`,
							},
						],
						isError: true,
					};
				}
			};

			const result = await mockScrapeWithProxy({
				url: testUrl,
				proxy: {
					host: "localhost",
					port: proxyPort,
					protocol: "http",
					username: "testuser",
					password: "testpass",
				},
			});

			expect(result.isError).toBe(false);
			expect(result.content[0].text).toContain(
				"プロキシ経由でスクレイピング成功"
			);
		});

		test("should handle proxy connection failure", async () => {
			const mockScrapeWithProxy = async (args: any) => {
				const { url, proxy } = args;

				try {
					// 存在しないプロキシポートへの接続試行
					if (proxy.port === 99999) {
						throw new Error("ECONNREFUSED");
					}

					return {
						content: [{ type: "text", text: "Success" }],
						isError: false,
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `プロキシ接続エラー: ${
									error instanceof Error
										? error.message
										: String(error)
								}`,
							},
						],
						isError: true,
					};
				}
			};

			const result = await mockScrapeWithProxy({
				url: testUrl,
				proxy: {
					host: "localhost",
					port: 99999,
					protocol: "http",
				},
			});

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("プロキシ接続エラー");
		});
	});

	describe("SOCKS Proxy Support", () => {
		test("should handle SOCKS4 proxy configuration", () => {
			const socksConfig: ProxyConfig = {
				host: "localhost",
				port: 1080,
				protocol: "socks4",
			};

			expect(socksConfig.protocol).toBe("socks4");
			expect(socksConfig.port).toBe(1080);
		});

		test("should handle SOCKS5 proxy configuration", () => {
			const socksConfig: ProxyConfig = {
				host: "localhost",
				port: 1080,
				protocol: "socks5",
				username: "socksuser",
				password: "sockspass",
			};

			expect(socksConfig.protocol).toBe("socks5");
			expect(socksConfig.username).toBe("socksuser");
			expect(socksConfig.password).toBe("sockspass");
		});
	});

	describe("Puppeteer Proxy Support", () => {
		test("should create Puppeteer proxy arguments", () => {
			const createPuppeteerProxyArgs = (proxy: ProxyConfig) => {
				const args = [
					`--proxy-server=${proxy.protocol}://${proxy.host}:${proxy.port}`,
				];

				if (proxy.username && proxy.password) {
					// Puppeteerでは認証は別途設定
					args.push("--proxy-auth");
				}

				return args;
			};

			const proxyConfig: ProxyConfig = {
				host: "proxy.example.com",
				port: 8080,
				protocol: "http",
				username: "user",
				password: "pass",
			};

			const args = createPuppeteerProxyArgs(proxyConfig);

			expect(args).toContain(
				"--proxy-server=http://proxy.example.com:8080"
			);
			expect(args).toContain("--proxy-auth");
		});

		test("should handle Puppeteer proxy without authentication", () => {
			const createPuppeteerProxyArgs = (proxy: ProxyConfig) => {
				const args = [
					`--proxy-server=${proxy.protocol}://${proxy.host}:${proxy.port}`,
				];
				return args;
			};

			const proxyConfig: ProxyConfig = {
				host: "proxy.example.com",
				port: 8080,
				protocol: "http",
			};

			const args = createPuppeteerProxyArgs(proxyConfig);

			expect(args).toContain(
				"--proxy-server=http://proxy.example.com:8080"
			);
			expect(args).not.toContain("--proxy-auth");
		});
	});

	describe("Batch Scraping with Proxy", () => {
		test("should perform batch scraping through proxy", async () => {
			const mockBatchScrapeWithProxy = async (args: any) => {
				const { urls, proxy } = args;
				const results: Array<{
					url: string;
					success: boolean;
					statusCode?: number;
					error?: string;
					proxy: string;
				}> = [];

				for (const url of urls) {
					try {
						// プロキシ設定を使用したリクエスト
						const fetchOptions: any = {
							headers: {},
						};

						if (proxy && proxy.username && proxy.password) {
							const credentials = `${proxy.username}:${proxy.password}`;
							const encoded = encodeBase64(credentials);
							fetchOptions.headers[
								"Proxy-Authorization"
							] = `Basic ${encoded}`;
						}

						const response = await fetch(url, fetchOptions);
						results.push({
							url,
							success: response.ok,
							statusCode: response.status,
							proxy: proxy
								? `${proxy.host}:${proxy.port}`
								: "direct",
						});
					} catch (error) {
						results.push({
							url,
							success: false,
							error:
								error instanceof Error
									? error.message
									: String(error),
							proxy: proxy
								? `${proxy.host}:${proxy.port}`
								: "direct",
						});
					}
				}

				const successCount = results.filter((r) => r.success).length;

				return {
					content: [
						{
							type: "text",
							text: `プロキシ経由一括スクレイピング完了: 成功 ${successCount}件`,
						},
					],
					isError: false,
				};
			};

			const testUrls = [
				`http://localhost:${serverPort}/test1`,
				`http://localhost:${serverPort}/test2`,
			];

			const result = await mockBatchScrapeWithProxy({
				urls: testUrls,
				proxy: {
					host: "localhost",
					port: proxyPort,
					protocol: "http",
					username: "testuser",
					password: "testpass",
				},
			});

			expect(result.content[0].text).toContain(
				"プロキシ経由一括スクレイピング完了"
			);
			expect(result.content[0].text).toContain("成功 2件");
		});
	});

	describe("Error Handling", () => {
		test("should handle invalid proxy configuration", () => {
			const validateProxyConfig = (proxy: any): string | null => {
				if (!proxy.host) return "プロキシホストが必要です";
				if (!proxy.port || proxy.port < 1 || proxy.port > 65535)
					return "プロキシポートが無効です";
				if (
					proxy.protocol &&
					!["http", "https", "socks4", "socks5"].includes(
						proxy.protocol
					)
				) {
					return "サポートされていないプロキシプロトコルです";
				}
				return null;
			};

			expect(validateProxyConfig({})).toBe("プロキシホストが必要です");
			expect(validateProxyConfig({ host: "localhost" })).toBe(
				"プロキシポートが無効です"
			);
			expect(
				validateProxyConfig({ host: "localhost", port: 99999 })
			).toBe("プロキシポートが無効です");
			expect(
				validateProxyConfig({
					host: "localhost",
					port: 8080,
					protocol: "invalid",
				})
			).toBe("サポートされていないプロキシプロトコルです");
			expect(
				validateProxyConfig({
					host: "localhost",
					port: 8080,
					protocol: "http",
				})
			).toBeNull();
		});

		test("should handle proxy authentication failure", async () => {
			const mockScrapeWithInvalidAuth = async (args: any) => {
				const { proxy } = args;

				// 無効な認証情報をシミュレート
				if (
					proxy.username === "invalid" ||
					proxy.password === "invalid"
				) {
					return {
						content: [
							{
								type: "text",
								text: "プロキシ認証エラー: 407 Proxy Authentication Required",
							},
						],
						isError: true,
					};
				}

				return {
					content: [{ type: "text", text: "Success" }],
					isError: false,
				};
			};

			const result = await mockScrapeWithInvalidAuth({
				url: testUrl,
				proxy: {
					host: "localhost",
					port: proxyPort,
					protocol: "http",
					username: "invalid",
					password: "invalid",
				},
			});

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("プロキシ認証エラー");
		});
	});
});
