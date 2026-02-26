import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { Database } from "../db.js";
import { GroupQueue } from "../group-queue.js";
import { startWebhookServer, verifyHmacSignature } from "../webhooks.js";
import type { Server } from "node:http";
import fs from "fs";
import path from "path";
import os from "os";

describe("webhooks", () => {
  describe("verifyHmacSignature", () => {
    const secret = "test-secret-key";

    it("should accept a valid HMAC signature", () => {
      const body = '{"event":"push","data":"test"}';
      const hmac = createHmac("sha256", secret).update(body).digest("hex");
      const signature = `sha256=${hmac}`;

      expect(verifyHmacSignature(body, secret, signature)).toBe(true);
    });

    it("should reject an invalid HMAC signature", () => {
      const body = '{"event":"push","data":"test"}';
      const signature = "sha256=invalidsignature0000000000000000000000000000000000000000000000";

      expect(verifyHmacSignature(body, secret, signature)).toBe(false);
    });

    it("should reject when signature is undefined", () => {
      const body = '{"event":"push"}';
      expect(verifyHmacSignature(body, secret, undefined)).toBe(false);
    });

    it("should reject when signature has wrong length", () => {
      const body = '{"event":"push"}';
      expect(verifyHmacSignature(body, secret, "sha256=short")).toBe(false);
    });

    it("should reject when body is tampered with", () => {
      const originalBody = '{"event":"push","data":"test"}';
      const hmac = createHmac("sha256", secret).update(originalBody).digest("hex");
      const signature = `sha256=${hmac}`;

      const tamperedBody = '{"event":"push","data":"tampered"}';
      // Lengths differ so it returns false
      expect(verifyHmacSignature(tamperedBody, secret, signature)).toBe(false);
    });
  });

  describe("webhook server", () => {
    let db: Database;
    let queue: GroupQueue;
    let server: Server;
    let dbPath: string;
    let port: number;

    beforeEach(() => {
      dbPath = path.join(os.tmpdir(), `webhook-test-${Date.now()}.db`);
      db = new Database(dbPath);
      queue = new GroupQueue(5);
      port = 30000 + Math.floor(Math.random() * 10000);
    });

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      db.close();
      try {
        fs.unlinkSync(dbPath);
      } catch {
        // ignore
      }
    });

    it("should accept webhook with valid signature", async () => {
      const enqueueSpy = vi.spyOn(queue, "enqueue");
      const secret = "my-webhook-secret";

      // Register the group and set webhook secret
      db.registerGroup({
        folder: "test-group",
        chatJid: "chat-1",
        isMain: true,
        queueMode: "followup",
        debounceMs: 0,
        maxRetries: 3,
      });
      db.setWebhookSecret("test-group", secret);

      server = startWebhookServer(queue, db, port);
      await new Promise(resolve => server.once("listening", resolve));

      const body = JSON.stringify({ event: "deploy", status: "success" });
      const hmac = createHmac("sha256", secret).update(body).digest("hex");

      const response = await fetch(`http://localhost:${port}/webhook/test-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": `sha256=${hmac}`,
        },
        body,
      });

      expect(response.status).toBe(200);
      expect(enqueueSpy).toHaveBeenCalledWith(
        "test-group",
        expect.stringContaining("WEBHOOK received:")
      );
    });

    it("should reject webhook with invalid signature", async () => {
      const enqueueSpy = vi.spyOn(queue, "enqueue");
      const secret = "my-webhook-secret";

      db.registerGroup({
        folder: "test-group",
        chatJid: "chat-1",
        isMain: true,
        queueMode: "followup",
        debounceMs: 0,
        maxRetries: 3,
      });
      db.setWebhookSecret("test-group", secret);

      server = startWebhookServer(queue, db, port);
      await new Promise(resolve => server.once("listening", resolve));

      const body = JSON.stringify({ event: "deploy" });

      const response = await fetch(`http://localhost:${port}/webhook/test-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": "sha256=0000000000000000000000000000000000000000000000000000000000000000",
        },
        body,
      });

      expect(response.status).toBe(401);
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it("should accept webhook without secret configured (no verification)", async () => {
      const enqueueSpy = vi.spyOn(queue, "enqueue");

      server = startWebhookServer(queue, db, port);
      await new Promise(resolve => server.once("listening", resolve));

      const body = JSON.stringify({ event: "test" });

      const response = await fetch(`http://localhost:${port}/webhook/open-group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      expect(response.status).toBe(200);
      expect(enqueueSpy).toHaveBeenCalledWith(
        "open-group",
        expect.stringContaining("WEBHOOK received:")
      );
    });

    it("should return 404 for unknown routes", async () => {
      server = startWebhookServer(queue, db, port);
      await new Promise(resolve => server.once("listening", resolve));

      const response = await fetch(`http://localhost:${port}/unknown`);
      expect(response.status).toBe(404);
    });
  });
});
