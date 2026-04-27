import React, { createContext, useContext, useEffect, useState } from 'react';

export type LogLevel = 'info' | 'warning' | 'error';

export type LogEntry = {
  id: number;
  time: string;
  message: string;
  level: LogLevel;
};

type LogContextType = {
  logs: LogEntry[];
  clearLogs: () => void;
};

const LogContext = createContext<LogContextType>({ logs: [], clearLogs: () => {} });

export const useLogContext = () => useContext(LogContext);

let logIdCounter = 0;

const detectLevel = (message: string): LogLevel => {
  const msg = message.toUpperCase();
  if (msg.includes('ERROR')) return 'error';
  if (msg.includes('WARNING') || msg.includes('WARN')) return 'warning';
  return 'info';
};

export const LogProvider = ({ children }: { children: React.ReactNode }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const handler = (_event: unknown, message: string) => {
      const entry: LogEntry = {
        id: ++logIdCounter,
        time: new Date().toLocaleTimeString('it-IT'),
        message,
        level: detectLevel(message)
      };
      setLogs((prev) => [...prev.slice(-199), entry]);
    };
    (window.onLog as (cb: typeof handler) => void)(handler);
    return () => {
      window.offLog();
    };
  }, []);

  const clearLogs = () => setLogs([]);

  return <LogContext.Provider value={{ logs, clearLogs }}>{children}</LogContext.Provider>;
};
