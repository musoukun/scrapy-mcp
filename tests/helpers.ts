// テストヘルパー関数
import * as http from "http";
import * as net from "net";

// モックHTTPサーバーを作成
export function createMockServer(port: number = 3001): Promise<http.Server> {
	return new Promise((resolve, reject) => {
		const server = http.createServer((req, res) => {
			res.setHeader("Content-Type", "text/html; charset=utf-8");

			if (req.url === "/test1") {
				res.writeHead(200);
				res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Test Page 1</title></head>
            <body>
              <h1>Test Title 1</h1>
              <p class="content">Test content 1</p>
            </body>
          </html>
        `);
			} else if (req.url === "/test2") {
				res.writeHead(200);
				res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Test Page 2</title></head>
            <body>
              <h1>Test Title 2</h1>
              <p class="content">Test content 2</p>
            </body>
          </html>
        `);
			} else if (req.url === "/test3") {
				res.writeHead(200);
				res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Test Page 3</title></head>
            <body>
              <h1>Test Title 3</h1>
              <p class="content">Test content 3</p>
            </body>
          </html>
        `);
			} else if (req.url === "/error") {
				res.writeHead(404);
				res.end("Not Found");
			} else if (req.url === "/slow") {
				// 遅いレスポンス（3秒後）
				setTimeout(() => {
					res.writeHead(200);
					res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Slow Page</title></head>
              <body>
                <h1>Slow Response</h1>
                <p class="content">This page loads slowly</p>
              </body>
            </html>
          `);
				}, 3000);
			} else {
				res.writeHead(404);
				res.end("Not Found");
			}
		});

		server.listen(port, () => {
			resolve(server);
		});

		server.on("error", reject);
	});
}

// シンプルなプロキシサーバーを作成
export function createMockProxy(port: number = 8080): Promise<http.Server> {
	return new Promise((resolve, reject) => {
		const server = http.createServer((req, res) => {
			// プロキシ認証をチェック
			const auth = req.headers["proxy-authorization"];
			if (!auth || !auth.includes("Basic")) {
				res.writeHead(407, {
					"Proxy-Authenticate": 'Basic realm="proxy"',
				});
				res.end("Proxy Authentication Required");
				return;
			}

			// 実際のリクエストを転送（簡易実装）
			const options = {
				hostname: req.headers.host?.split(":")[0] || "localhost",
				port: parseInt(req.headers.host?.split(":")[1] || "80"),
				path: req.url,
				method: req.method,
				headers: { ...req.headers },
			};

			delete options.headers["proxy-authorization"];

			const proxyReq = http.request(options, (proxyRes) => {
				res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
				proxyRes.pipe(res);
			});

			proxyReq.on("error", (err) => {
				res.writeHead(500);
				res.end("Proxy Error");
			});

			req.pipe(proxyReq);
		});

		server.listen(port, () => {
			resolve(server);
		});

		server.on("error", reject);
	});
}

// ポートが利用可能かチェック
export function isPortAvailable(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();

		server.listen(port, () => {
			server.close(() => {
				resolve(true);
			});
		});

		server.on("error", () => {
			resolve(false);
		});
	});
}

// 利用可能なポートを見つける
export async function findAvailablePort(
	startPort: number = 3000
): Promise<number> {
	let port = startPort;
	while (port < startPort + 100) {
		if (await isPortAvailable(port)) {
			return port;
		}
		port++;
	}
	throw new Error("No available port found");
}

// テスト用のURL生成
export function createTestUrls(basePort: number, count: number = 3): string[] {
	const urls: string[] = [];
	for (let i = 1; i <= count; i++) {
		urls.push(`http://localhost:${basePort}/test${i}`);
	}
	return urls;
}

// Base64エンコード（プロキシ認証用）
export function encodeBase64(str: string): string {
	return Buffer.from(str).toString("base64");
}
