/**
 * React example for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import React, { useEffect, useState } from "react";
import {
  createEventEmitter,
  useNotificationChannel,
  type EventEmitter,
  type BaseEvent,
  type UnsubscribeFunction,
} from "@core";

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

interface NotificationPayload {
  id: string;
  message: string;
  type: "info" | "success" | "error";
}

const globalEmitter: EventEmitter = createEventEmitter({
  buffer: { maxSize: 100, strategy: "fifo" },
});

export function ChatComponent() {
  const { subscribe, emit, clear } = useNotificationChannel<ChatMessage>({
    emitter: globalEmitter,
    channel: "chat:messages",
    replay: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      setMessages((prev) => [...prev, event.data]);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    emit({
      id: `msg-${Date.now()}`,
      user: "current-user",
      text: inputValue,
      timestamp: Date.now(),
    });

    setInputValue("");
  };

  return (
    <div className="chat-component">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

export function NotificationToast() {
  const { subscribe } = useNotificationChannel<NotificationPayload>({
    emitter: globalEmitter,
    channel: "notifications",
    replay: false,
  });

  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      setNotifications((prev) => [...prev, event.data]);

      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== event.data.id)
        );
      }, 5000);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  return (
    <div className="notification-toast">
      {notifications.map((notif) => (
        <div key={notif.id} className={`notif notif-${notif.type}`}>
          {notif.message}
        </div>
      ))}
    </div>
  );
}

export function EventLogger() {
  const { subscribe } = useNotificationChannel({
    emitter: globalEmitter,
    channel: "**",
    replay: false,
  });

  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe((event: BaseEvent<unknown>) => {
      const logEntry = `[${new Date(event.timestamp).toISOString()}] ${event.channel}: ${JSON.stringify(event.data)}`;
      setLogs((prev) => [...prev.slice(-99), logEntry]);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  return (
    <div className="event-logger">
      <h3>Event Log</h3>
      <div className="logs">
        {logs.map((log, idx) => (
          <div key={idx} className="log-entry">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

export function useReactiveState<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [emitter] = useState(() => createEventEmitter<{ previous: T; current: T }>());

  const update = (newValue: T | ((prev: T) => T)) => {
    const resolved = typeof newValue === "function"
      ? (newValue as (prev: T) => T)(value)
      : newValue;
    
    emitter.emit("update", { previous: value, current: resolved });
    setValue(resolved);
  };

  return { value, setValue: update, emitter };
}

export function useEventEffect<T>(
  emitter: EventEmitter,
  channel: string,
  callback: (data: T) => void
) {
  useEffect(() => {
    const unsubscribe = emitter.on<T>(channel, (event) => {
      callback(event.data);
    });

    return () => {
      unsubscribe();
    };
  }, [emitter, channel, callback]);
}

export { globalEmitter };
