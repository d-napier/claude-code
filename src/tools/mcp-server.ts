import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { Database } from "../db.js";
import { config } from "../config.js";

let _db: Database | undefined;

function getDb(): Database {
  if (!_db) {
    _db = new Database(config.DB_PATH);
  }
  return _db;
}

/**
 * Overrides the Database instance used by the MCP server.
 * Primarily for testing.
 */
export function setDb(db: Database): void {
  _db = db;
}

/**
 * Creates the array of IPC tool definitions for agent communication.
 * Exported separately for testing.
 */
export function createIpcTools(groupFolder: string, isMain: boolean) {
  const sendMessage = tool(
    "send_message",
    "Send a message to another chat or group. Non-main agents can only send to their own group.",
    {
      chatId: z.string().describe("Target chat/group identifier"),
      text: z.string().describe("Message text to send"),
    },
    async ({ chatId, text }, _extra: unknown) => {
      if (!isMain && chatId !== groupFolder) {
        return {
          content: [{ type: "text" as const, text: "Unauthorized: non-main agents can only send messages to their own group" }],
          isError: true,
        };
      }
      const db = getDb();
      db.storeMessage({
        chatId,
        messageId: `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        timestamp: new Date().toISOString(),
        sender: "agent",
        isDm: false,
      });
      return {
        content: [{ type: "text" as const, text: `Message sent to ${chatId}` }],
      };
    }
  );

  const scheduleTask = tool(
    "schedule_task",
    "Create a scheduled task (cron, interval, or one-time). Non-main agents can only schedule tasks for their own group.",
    {
      prompt: z.string().describe("The task prompt for the agent to execute"),
      scheduleType: z.enum(["cron", "interval", "once"]).describe("Schedule type: cron expression, interval in ms, or one-time ISO timestamp"),
      scheduleValue: z.string().describe("Cron expression, millisecond interval, or ISO 8601 timestamp"),
      targetGroup: z.string().optional().describe("Target group folder (main agent only, defaults to own group)"),
    },
    async ({ prompt, scheduleType, scheduleValue, targetGroup }, _extra: unknown) => {
      const target = isMain ? (targetGroup ?? groupFolder) : groupFolder;
      const db = getDb();
      const taskId = db.createTask({
        prompt,
        scheduleType,
        scheduleValue,
        groupFolder: target,
        status: "active",
      });
      return {
        content: [{ type: "text" as const, text: `Task ${taskId} scheduled` }],
      };
    }
  );

  const listTasks = tool(
    "list_tasks",
    "List scheduled tasks. Main agents see all tasks; non-main agents see only their group's tasks.",
    {},
    async (_args: Record<string, never>, _extra: unknown) => {
      const db = getDb();
      const tasks = isMain ? db.getAllTasks() : db.getTasksByGroup(groupFolder);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }],
      };
    }
  );

  const pauseTask = tool(
    "pause_task",
    "Pause a scheduled task by its ID. Non-main agents can only pause their own group's tasks.",
    {
      taskId: z.string().describe("The ID of the task to pause"),
    },
    async ({ taskId }, _extra: unknown) => {
      const db = getDb();
      const task = db.getTask(taskId);
      if (!task) {
        return {
          content: [{ type: "text" as const, text: `Task ${taskId} not found` }],
          isError: true,
        };
      }
      if (!isMain && task.groupFolder !== groupFolder) {
        return {
          content: [{ type: "text" as const, text: "Unauthorized: cannot pause tasks belonging to another group" }],
          isError: true,
        };
      }
      db.setTaskStatus(taskId, "paused");
      return {
        content: [{ type: "text" as const, text: `Task ${taskId} paused` }],
      };
    }
  );

  const resumeTask = tool(
    "resume_task",
    "Resume a paused task by its ID. Non-main agents can only resume their own group's tasks.",
    {
      taskId: z.string().describe("The ID of the task to resume"),
    },
    async ({ taskId }, _extra: unknown) => {
      const db = getDb();
      const task = db.getTask(taskId);
      if (!task) {
        return {
          content: [{ type: "text" as const, text: `Task ${taskId} not found` }],
          isError: true,
        };
      }
      if (!isMain && task.groupFolder !== groupFolder) {
        return {
          content: [{ type: "text" as const, text: "Unauthorized: cannot resume tasks belonging to another group" }],
          isError: true,
        };
      }
      db.setTaskStatus(taskId, "active");
      return {
        content: [{ type: "text" as const, text: `Task ${taskId} resumed` }],
      };
    }
  );

  const cancelTask = tool(
    "cancel_task",
    "Cancel and delete a scheduled task by its ID. Non-main agents can only cancel their own group's tasks.",
    {
      taskId: z.string().describe("The ID of the task to cancel"),
    },
    async ({ taskId }, _extra: unknown) => {
      const db = getDb();
      const task = db.getTask(taskId);
      if (!task) {
        return {
          content: [{ type: "text" as const, text: `Task ${taskId} not found` }],
          isError: true,
        };
      }
      if (!isMain && task.groupFolder !== groupFolder) {
        return {
          content: [{ type: "text" as const, text: "Unauthorized: cannot cancel tasks belonging to another group" }],
          isError: true,
        };
      }
      db.deleteTask(taskId);
      return {
        content: [{ type: "text" as const, text: `Task ${taskId} cancelled` }],
      };
    }
  );

  return [sendMessage, scheduleTask, listTasks, pauseTask, resumeTask, cancelTask];
}

/**
 * Creates an MCP server with IPC tools that agents can use to
 * communicate across groups and manage scheduled tasks.
 *
 * @param groupFolder - The folder identifier for the agent's group
 * @param isMain - Whether this agent is the main orchestrator agent
 * @returns MCP server configuration object for use with query() options.mcpServers
 */
export function createAgentMcpServer(groupFolder: string, isMain: boolean) {
  return createSdkMcpServer({
    name: "agent-ipc",
    version: "1.0.0",
    tools: createIpcTools(groupFolder, isMain),
  });
}
