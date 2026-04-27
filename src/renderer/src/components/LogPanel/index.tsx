import { useEffect, useRef, useState } from 'react';
import { useLogContext } from '../../Context/LogContext';

const LEVEL_CLASS: Record<string, string> = {
  info: 'text-gray-300',
  warning: 'text-yellow-400',
  error: 'text-red-400'
};

const LogPanel = () => {
  const { logs, clearLogs } = useLogContext();
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  // Auto-apri quando arriva un nuovo log
  useEffect(() => {
    if (logs.length > prevLenRef.current) {
      setOpen(true);
      prevLenRef.current = logs.length;
    }
  }, [logs.length]);

  // Scroll all'ultimo log quando il pannello è aperto
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, open]);

  const lastEntry = logs[logs.length - 1];
  const hasError = lastEntry?.level === 'error';
  const hasWarning = lastEntry?.level === 'warning';

  return (
    <div className="shrink-0 border-t border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
      {/* Barra titolo */}
      <div
        className="flex cursor-pointer select-none items-center justify-between px-4 py-2"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-black dark:text-white">Log operazioni</span>
          {logs.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">({logs.length})</span>
          )}
          {hasError && <span className="h-2 w-2 rounded-full bg-danger" title="Ultimo log: errore" />}
          {!hasError && hasWarning && <span className="h-2 w-2 rounded-full bg-warning" title="Ultimo log: avviso" />}
        </div>
        <div className="flex items-center gap-3">
          {logs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Pulisci
            </button>
          )}
          <span className="text-xs text-gray-500">{open ? '▼' : '▲'}</span>
        </div>
      </div>

      {/* Voci log */}
      {open && (
        <div className="h-36 overflow-y-auto bg-black px-4 pb-2 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="italic text-gray-600">Nessun log</p>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className={`flex gap-2 py-0.5 ${LEVEL_CLASS[entry.level]}`}>
                <span className="shrink-0 text-gray-600">{entry.time}</span>
                <span>{entry.message}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

export default LogPanel;
