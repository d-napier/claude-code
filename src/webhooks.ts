import { createServer, type Server, type IncomingMessage } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { GroupQueue } from "./group-queue.js";
import type { Database } from "./db.js";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

export function verifyHmacSignature(
  body: string,
  secret: string,
  signature: string | undefined
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`);
  const actualBuf = Buffer.from(signature);

  if (actualBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(actualBuf, expectedBuf);
}

export function startWebhookServer(
  queue: GroupQueue,
  db: Database,
  port: number = 3001
): Server {
  const server = createServer(async (req, res) => {
    // Health check endpoint
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method === "POST" && req.url?.startsWith("/webhook/")) {
      const groupFolder = decodeURIComponent(req.url.split("/webhook/")[1]);

      if (!groupFolder) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing group folder" }));
        return;
      }

      let body: string;
      try {
        body = await readBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to read body" }));
        return;
      }

      // HMAC signature verification
      const secret = db.getWebhookSecret(groupFolder);
      if (secret) {
        const signature = req.headers["x-webhook-signature"] as string | undefined;
        if (!verifyHmacSignature(body, secret, signature)) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid signature" }));
          return;
        }
      }

      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      await queue.enqueue(groupFolder, `WEBHOOK received: ${JSON.stringify(payload)}`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port);
  return server;
}
