import { useEffect, useRef, useState } from "react";
import { getWebSocketURL } from "../utils/api";

export default function useWebSocket(onMessageReceived?: (event: string, data: any) => void) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = () => {
    try {
      const url = getWebSocketURL();
      console.log(`Connecting WebSocket to: ${url}`);
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connection established successfully.");
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log("Received WebSocket frame:", payload);
          if (onMessageReceived) {
            onMessageReceived(payload.event, payload);
          }
        } catch (err) {
          console.error("Error parsing WebSocket frame:", err);
        }
      };

      socket.onclose = (event) => {
        console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
        setConnected(false);
        // Exponential backoff reconnect
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 5000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket encountered an error:", err);
        socket.close();
      };
    } catch (e) {
      console.error("Failed to initialize WebSocket handshake:", e);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        // Remove close listener to prevent reconnect loop on manual unmount
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { connected };
}
