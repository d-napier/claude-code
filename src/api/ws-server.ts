/**
 * WebSocket server using `ws` library, attached to HTTP server.
 *
 * Broadcasts events to all connected clients with optional
 * session-based selective delivery.
 */
import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { randomUUID } from "crypto";
import type { WsEvent, WsClientMessage } from "./events.js";

interface ClientState {
  id: string;
  ws: WebSocket;
  subscribedSessions: Set<string>;
}

export interface WsServer {
  broadcast(event: WsEvent): void;
  sendTo(clientId: string, event: WsEvent): void;
  getClientCount(): number;
  close(): void;
}

export type ClientMessageHandler = (clientId: string, message: WsClientMessage) => void;

export function createWsServer(
  httpServer: HttpServer,
  onClientMessage?: ClientMessageHandler,
): WsServer {
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map<string, ClientState>();

  wss.on("connection", (ws) => {
    const clientId = randomUUID();
    const state: ClientState = {
      id: clientId,
      ws,
      subscribedSessions: new Set(),
    };
    clients.set(clientId, state);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as WsClientMessage;
        handleClientMessage(state, msg);
        onClientMessage?.(clientId, msg);
      } catch {
        ws.send(JSON.stringify({
          type: "error:agent",
          timestamp: new Date().toISOString(),
          payload: { error: "Invalid message format" },
        }));
      }
    });

    ws.on("close", () => {
      clients.delete(clientId);
    });

    ws.on("error", () => {
      clients.delete(clientId);
    });

    // Send welcome with clientId
    ws.send(JSON.stringify({
      type: "session:update",
      timestamp: new Date().toISOString(),
      payload: { clientId, status: "connected" },
    }));
  });

  function handleClientMessage(client: ClientState, msg: WsClientMessage): void {
    switch (msg.type) {
      case "session:subscribe": {
        const sessionId = msg.payload.sessionId as string;
        if (sessionId) {
          client.subscribedSessions.add(sessionId);
        }
        break;
      }
      case "session:unsubscribe": {
        const sessionId = msg.payload.sessionId as string;
        if (sessionId) {
          client.subscribedSessions.delete(sessionId);
        }
        break;
      }
      // agent:interrupt and approval:respond are forwarded via onClientMessage callback
    }
  }

  function shouldDeliverToClient(client: ClientState, event: WsEvent): boolean {
    // Session-specific events are only sent to subscribed clients
    const sessionId = event.payload.sessionId as string | undefined;
    if (sessionId && client.subscribedSessions.size > 0) {
      return client.subscribedSessions.has(sessionId);
    }
    // Non-session events (or clients with no subscriptions) get everything
    return true;
  }

  function sendRaw(ws: WebSocket, data: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }

  return {
    broadcast(event: WsEvent): void {
      const data = JSON.stringify(event);
      for (const client of clients.values()) {
        if (shouldDeliverToClient(client, event)) {
          sendRaw(client.ws, data);
        }
      }
    },

    sendTo(clientId: string, event: WsEvent): void {
      const client = clients.get(clientId);
      if (client) {
        sendRaw(client.ws, JSON.stringify(event));
      }
    },

    getClientCount(): number {
      return clients.size;
    },

    close(): void {
      for (const client of clients.values()) {
        client.ws.close();
      }
      wss.close();
    },
  };
}
