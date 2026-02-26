"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAppStore, dispatchServerEvent } from "./store";
import type { ClientMessage, ServerEvent } from "./types";

const MAX_RECONNECT_DELAY_MS = 8000;

function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws`;
}

export function useWebSocket(): {
  connected: boolean;
  sendMessage: (msg: ClientMessage) => void;
} {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessage = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    function connect() {
      const url = getWsUrl();
      if (!url) return;

      useAppStore.getState().setWsStatus("connecting");

      // Cookie-based auth: session cookie is sent automatically on the
      // Upgrade request. No token in the URL.
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = async () => {
        setConnected(true);
        reconnectAttemptRef.current = 0;
        useAppStore.getState().setWsStatus("open");

        // After reconnect, fetch a full state snapshot so the store is
        // consistent with reality before resuming live event processing.
        try {
          const res = await fetch("/api/state/snapshot");
          if (res.ok) {
            const snapshot = await res.json();
            useAppStore.getState().applySnapshot(snapshot);
          }
        } catch (err) {
          console.error("Failed to fetch state snapshot after reconnect", err);
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        let msg: ServerEvent;
        try {
          msg = JSON.parse(event.data as string) as ServerEvent;
        } catch {
          console.warn("Malformed WS message discarded", event.data);
          return;
        }
        dispatchServerEvent(msg);
      };

      ws.onclose = () => {
        setConnected(false);
        useAppStore.getState().setWsStatus("closed");

        // Exponential backoff: 1s, 2s, 4s, 8s (max)
        const delay = Math.min(
          1000 * 2 ** reconnectAttemptRef.current,
          MAX_RECONNECT_DELAY_MS
        );
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after onerror, which handles reconnection.
        // Nothing additional to do here.
      };
    }

    connect();

    return () => {
      // Clean up: clear any pending reconnect timer (React Strict Mode safe)
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      // Close the WebSocket if open
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null; // Prevent reconnect on intentional close
        ws.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { connected, sendMessage };
}
