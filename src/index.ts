import { Database } from "./db.js";
import { GroupQueue } from "./group-queue.js";
import { runAgent } from "./agent-runner.js";
import { recoverPendingMessages, updateCursorAfterProcessing } from "./recovery.js";
import { startMessageLoop, stopMessageLoop } from "./message-loop.js";
import { startSchedulerLoop, stopSchedulerLoop } from "./scheduler.js";
import { startHeartbeatLoop, stopHeartbeatLoop } from "./heartbeat.js";
import { startIpcWatcher } from "./ipc.js";
import { startWebhookServer } from "./webhooks.js";
import { buildHooks } from "./hooks/index.js";
import { createAgentMcpServer, setDb } from "./tools/mcp-server.js";
import { config } from "./config.js";
import pino from "pino";

const logger = pino({ level: config.LOG_LEVEL });

let db: Database;
let queue: GroupQueue;
let ipcWatcher: { stop: () => void } | undefined;
let webhookServer: ReturnType<typeof startWebhookServer> | undefined;

async function main() {
  logger.info("Starting Claude Claw orchestrator...");

  // 1. Initialize database
  db = new Database(config.DB_PATH);
  setDb(db);

  // 2. Load registered groups
  const groups = db.getAllGroups();
  const groupMap = new Map(groups.map(g => [g.folder, g]));
  logger.info({ groupCount: groups.length }, "Loaded registered groups");

  // 3. Create GroupQueue with per-group configs
  queue = new GroupQueue(config.MAX_CONCURRENT);

  for (const group of groups) {
    queue.setGroupConfig(group.folder, {
      queueMode: group.queueMode,
      debounceMs: group.debounceMs,
      maxRetries: group.maxRetries,
    });
  }

  // 4. Set process function
  queue.setProcessFn(async (groupFolder, message, abort) => {
    const group = groupMap.get(groupFolder);
    const isMain = group?.isMain ?? false;

    logger.info({ groupFolder, messageLength: message.length }, "Processing message");

    const hooks = buildHooks(groupFolder, isMain);
    const mcpServers = {
      "claw-ipc": createAgentMcpServer(groupFolder, isMain),
    };

    const result = await runAgent(message, groupFolder, {
      sessionId: group?.sessionId,
      abortController: abort,
      isMain,
      hooks,
      mcpServers,
      onOutput: (text) => {
        logger.debug({ groupFolder, textLength: text.length }, "Agent output");
      },
    });

    // Update session ID
    if (result.sessionId) {
      db.setSessionId(groupFolder, result.sessionId);
      if (group) group.sessionId = result.sessionId;
    }

    // Update cursor
    updateCursorAfterProcessing(db, groupFolder, new Date().toISOString());

    logger.info(
      { groupFolder, status: result.status, cost: result.cost },
      "Agent run completed"
    );
  });

  // 5. Recover pending messages from crash
  const recovered = await recoverPendingMessages(queue, db);
  if (recovered > 0) {
    logger.info({ recovered }, "Recovered pending messages");
  }

  // 6. Start all input loops
  const groupFolders = groups.map(g => g.folder);

  // Webhook server
  webhookServer = startWebhookServer(queue, db, config.WEBHOOK_PORT);
  logger.info({ port: config.WEBHOOK_PORT }, "Webhook server started");

  // IPC watcher
  ipcWatcher = startIpcWatcher(queue, db, groupFolders);
  logger.info("IPC watcher started");

  // Start async loops (these run until shutdown)
  const heartbeatGroups = new Map(groups.map(g => [g.folder, { folder: g.folder }]));

  // Fire-and-forget the loops (they run indefinitely)
  startSchedulerLoop(queue, db, config.SCHEDULER_POLL_MS).catch(err => {
    logger.error(err, "Scheduler loop error");
  });

  startHeartbeatLoop(queue, heartbeatGroups, config.HEARTBEAT_INTERVAL_MS).catch(err => {
    logger.error(err, "Heartbeat loop error");
  });

  // Message loop requires channels — will be wired when channels are implemented
  // startMessageLoop(channels, queue, db, config.POLL_INTERVAL_MS);

  logger.info("Claude Claw orchestrator is running");
}

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down...");

  // Stop input loops
  stopMessageLoop();
  stopSchedulerLoop();
  stopHeartbeatLoop();
  ipcWatcher?.stop();

  // Close webhook server
  if (webhookServer) {
    await new Promise<void>((resolve) => {
      webhookServer!.close(() => resolve());
    });
  }

  // Drain queue
  await queue.shutdown(10_000);

  // Close database
  db.close();

  logger.info("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch(err => {
  logger.error(err, "Fatal error");
  process.exit(1);
});
