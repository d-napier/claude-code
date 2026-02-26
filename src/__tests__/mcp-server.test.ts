import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createAgentMcpServer, createIpcTools, setDb } from "../tools/mcp-server.js";
import { Database } from "../db.js";
import fs from "fs";

const TEST_DB = "./data/mcp-test.db";

describe("MCP Server", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(TEST_DB);
    setDb(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  describe("createAgentMcpServer", () => {
    it("should create an MCP server config object", () => {
      const server = createAgentMcpServer("my-group", true);
      expect(server).toBeDefined();
      expect(server.type).toBe("sdk");
      expect(server.name).toBe("agent-ipc");
      expect(server.instance).toBeDefined();
    });

    it("should create with isMain=false", () => {
      const server = createAgentMcpServer("my-group", false);
      expect(server).toBeDefined();
      expect(server.type).toBe("sdk");
    });
  });

  describe("createIpcTools", () => {
    it("should create all six tools", () => {
      const tools = createIpcTools("my-group", true);
      expect(tools).toHaveLength(6);

      const names = tools.map((t) => t.name);
      expect(names).toContain("send_message");
      expect(names).toContain("schedule_task");
      expect(names).toContain("list_tasks");
      expect(names).toContain("pause_task");
      expect(names).toContain("resume_task");
      expect(names).toContain("cancel_task");
    });

    it("should have handlers on each tool", () => {
      const tools = createIpcTools("my-group", true);
      for (const t of tools) {
        expect(typeof t.handler).toBe("function");
      }
    });
  });

  describe("send_message authorization", () => {
    function getSendMessage(groupFolder: string, isMain: boolean) {
      const tools = createIpcTools(groupFolder, isMain);
      return tools.find((t) => t.name === "send_message")!;
    }

    it("main agent can send to any chat", async () => {
      const sendMsg = getSendMessage("main-group", true);
      const result = await sendMsg.handler({ chatId: "other-group", text: "hello" }, {});
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Message sent");
    });

    it("main agent can send to own chat", async () => {
      const sendMsg = getSendMessage("main-group", true);
      const result = await sendMsg.handler({ chatId: "main-group", text: "hello" }, {});
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Message sent");
    });

    it("non-main agent can send to own chat", async () => {
      const sendMsg = getSendMessage("my-group", false);
      const result = await sendMsg.handler({ chatId: "my-group", text: "hello" }, {});
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Message sent");
    });

    it("non-main agent CANNOT send to a foreign chat", async () => {
      const sendMsg = getSendMessage("my-group", false);
      const result = await sendMsg.handler({ chatId: "other-group", text: "hello" }, {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });

  describe("schedule_task", () => {
    function getScheduleTask(groupFolder: string, isMain: boolean) {
      const tools = createIpcTools(groupFolder, isMain);
      return tools.find((t) => t.name === "schedule_task")!;
    }

    it("should create a task for own group", async () => {
      const scheduleTool = getScheduleTask("my-group", false);
      const result = await scheduleTool.handler(
        { prompt: "check updates", scheduleType: "cron", scheduleValue: "0 * * * *" },
        {}
      );
      expect(result.content[0].text).toContain("scheduled");
      const tasks = db.getTasksByGroup("my-group");
      expect(tasks).toHaveLength(1);
      expect(tasks[0].prompt).toBe("check updates");
    });

    it("non-main agent ignores targetGroup", async () => {
      const scheduleTool = getScheduleTask("my-group", false);
      await scheduleTool.handler(
        { prompt: "test", scheduleType: "once", scheduleValue: "2099-01-01T00:00:00Z", targetGroup: "other-group" },
        {}
      );
      // Should still create in own group, not the targetGroup
      const own = db.getTasksByGroup("my-group");
      const other = db.getTasksByGroup("other-group");
      expect(own).toHaveLength(1);
      expect(other).toHaveLength(0);
    });

    it("main agent can target another group", async () => {
      const scheduleTool = getScheduleTask("main-group", true);
      await scheduleTool.handler(
        { prompt: "test", scheduleType: "interval", scheduleValue: "60000", targetGroup: "worker-group" },
        {}
      );
      const tasks = db.getTasksByGroup("worker-group");
      expect(tasks).toHaveLength(1);
    });
  });

  describe("list_tasks", () => {
    it("main agent sees all tasks", async () => {
      db.createTask({ prompt: "a", scheduleType: "cron", scheduleValue: "* * * * *", groupFolder: "group-a", status: "active" });
      db.createTask({ prompt: "b", scheduleType: "cron", scheduleValue: "* * * * *", groupFolder: "group-b", status: "active" });

      const tools = createIpcTools("group-a", true);
      const listTool = tools.find((t) => t.name === "list_tasks")!;
      const result = await listTool.handler({} as Record<string, never>, {});
      const tasks = JSON.parse(result.content[0].text);
      expect(tasks).toHaveLength(2);
    });

    it("non-main agent sees only own group tasks", async () => {
      db.createTask({ prompt: "a", scheduleType: "cron", scheduleValue: "* * * * *", groupFolder: "group-a", status: "active" });
      db.createTask({ prompt: "b", scheduleType: "cron", scheduleValue: "* * * * *", groupFolder: "group-b", status: "active" });

      const tools = createIpcTools("group-a", false);
      const listTool = tools.find((t) => t.name === "list_tasks")!;
      const result = await listTool.handler({} as Record<string, never>, {});
      const tasks = JSON.parse(result.content[0].text);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].prompt).toBe("a");
    });
  });

  describe("pause_task authorization", () => {
    it("non-main agent cannot pause another group's task", async () => {
      const taskId = db.createTask({ prompt: "x", scheduleType: "cron", scheduleValue: "* * * * *", groupFolder: "other-group", status: "active" });

      const tools = createIpcTools("my-group", false);
      const pauseTool = tools.find((t) => t.name === "pause_task")!;
      const result = await pauseTool.handler({ taskId }, {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unauthorized");
    });

    it("main agent can pause any task", async () => {
      const taskId = db.createTask({ prompt: "x", scheduleType: "cron", scheduleValue: "* * * * *", groupFolder: "other-group", status: "active" });

      const tools = createIpcTools("main-group", true);
      const pauseTool = tools.find((t) => t.name === "pause_task")!;
      const result = await pauseTool.handler({ taskId }, {});
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("paused");
    });

    it("returns error for non-existent task", async () => {
      const tools = createIpcTools("my-group", true);
      const pauseTool = tools.find((t) => t.name === "pause_task")!;
      const result = await pauseTool.handler({ taskId: "nonexistent" }, {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });
  });

  describe("resume_task", () => {
    it("resumes a paused task", async () => {
      const taskId = db.createTask({ prompt: "x", scheduleType: "cron", scheduleValue: "* * * * *", groupFolder: "my-group", status: "paused" });

      const tools = createIpcTools("my-group", false);
      const resumeTool = tools.find((t) => t.name === "resume_task")!;
      const result = await resumeTool.handler({ taskId }, {});
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("resumed");

      const task = db.getTask(taskId);
      expect(task!.status).toBe("active");
    });

    it("non-main agent cannot resume another group's task", async () => {
      const taskId = db.createTask({ prompt: "x", scheduleType: "cron", scheduleValue: "* * * * *", groupFolder: "other-group", status: "paused" });

      const tools = createIpcTools("my-group", false);
      const resumeTool = tools.find((t) => t.name === "resume_task")!;
      const result = await resumeTool.handler({ taskId }, {});
      expect(result.isError).toBe(true);
    });
  });

  describe("cancel_task", () => {
    it("cancels and deletes a task", async () => {
      const taskId = db.createTask({ prompt: "x", scheduleType: "once", scheduleValue: "2099-01-01T00:00:00Z", groupFolder: "my-group", status: "active" });

      const tools = createIpcTools("my-group", false);
      const cancelTool = tools.find((t) => t.name === "cancel_task")!;
      const result = await cancelTool.handler({ taskId }, {});
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("cancelled");

      const task = db.getTask(taskId);
      expect(task).toBeUndefined();
    });

    it("non-main agent cannot cancel another group's task", async () => {
      const taskId = db.createTask({ prompt: "x", scheduleType: "once", scheduleValue: "2099-01-01T00:00:00Z", groupFolder: "other-group", status: "active" });

      const tools = createIpcTools("my-group", false);
      const cancelTool = tools.find((t) => t.name === "cancel_task")!;
      const result = await cancelTool.handler({ taskId }, {});
      expect(result.isError).toBe(true);

      // Task should still exist
      const task = db.getTask(taskId);
      expect(task).toBeDefined();
    });
  });
});
