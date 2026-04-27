import React, { useState, useEffect } from 'react';
import Breadcrumb from '@renderer/components/Breadcrumbs/Breadcrumb';
import type { Item, Schedule } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

const SchedulePage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'once' | 'recurring' | 'watch'>('once');
  const [name, setName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [startAt, setStartAt] = useState('');
  const [intervalHours, setIntervalHours] = useState(24);
  const [republishOnPageOver, setRepublishOnPageOver] = useState(3);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Schedule>>({});
  const [runningNow, setRunningNow] = useState<Set<string>>(new Set());

  useEffect(() => {
    window.getItems().then(setItems);
    window.getSchedules().then(setSchedules);
  }, []);

  const calcNextRun = (start: string, hours: number): string => {
    const startDate = new Date(start);
    const now = new Date();
    if (startDate > now) return startDate.toISOString();
    const diff = now.getTime() - startDate.getTime();
    const slots = Math.ceil(diff / (hours * 3600000));
    return new Date(startDate.getTime() + slots * hours * 3600000).toISOString();
  };

  const handleToggleItem = (id: string) => {
    setSelectedItemIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleAddSchedule = async () => {
    if (selectedItemIds.length === 0) { alert('Seleziona almeno un annuncio'); return; }
    if (scheduleType === 'once' && !scheduledAt) { alert('Inserisci data e ora'); return; }
    if (scheduleType === 'recurring' && !startAt) { alert('Inserisci la prima esecuzione'); return; }

    const now = new Date();
    const schedule: Schedule = {
      id: uuidv4(),
      name: name.trim() || undefined,
      itemIds: selectedItemIds,
      type: scheduleType,
      active: true,
      createdAt: now.toISOString(),
      ...(scheduleType === 'once' && { scheduledAt, nextRun: new Date(scheduledAt).toISOString() }),
      ...(scheduleType === 'recurring' && { startAt, intervalHours, nextRun: calcNextRun(startAt, intervalHours) }),
      ...(scheduleType === 'watch' && { republishOnPageOver }),
      ...(scheduleType === 'recurring' && republishOnPageOver > 0 ? { republishOnPageOver } : {}),
    };

    await window.saveSchedule(schedule);
    setSchedules((prev) => [...prev, schedule]);
    setSelectedItemIds([]);
    setName('');
    setScheduledAt('');
    setStartAt('');
  };

  const handleDeleteSchedule = async (id: string) => {
    await window.deleteSchedule(id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleTogglePause = async (schedule: Schedule) => {
    const updated = { ...schedule, paused: !schedule.paused };
    await window.updateSchedule(updated);
    setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? updated : s)));
  };

  const handleRunNow = async (schedule: Schedule) => {
    setRunningNow((prev) => new Set(prev).add(schedule.id));
    try {
      await window.runScheduleNow(schedule.id);
    } finally {
      setRunningNow((prev) => { const n = new Set(prev); n.delete(schedule.id); return n; });
      window.getSchedules().then(setSchedules);
    }
  };

  const handleStartEdit = (schedule: Schedule) => {
    setEditingId(schedule.id);
    setEditValues({
      name: schedule.name || '',
      scheduledAt: schedule.scheduledAt || '',
      startAt: schedule.startAt || '',
      intervalHours: schedule.intervalHours || 24,
      republishOnPageOver: schedule.republishOnPageOver || 0,
    });
  };

  const handleSaveEdit = async (schedule: Schedule) => {
    const updated: Schedule = { ...schedule, ...editValues };
    if (!updated.name?.trim()) delete updated.name;
    if (updated.type === 'recurring' && updated.startAt) {
      updated.nextRun = calcNextRun(updated.startAt, updated.intervalHours || 24);
    } else if (updated.type === 'once' && updated.scheduledAt) {
      updated.nextRun = new Date(updated.scheduledAt).toISOString();
    }
    await window.updateSchedule(updated);
    setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingId(null);
  };

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '—';

  const describeSchedule = (s: Schedule) => {
    if (s.type === 'watch') return `Soglia p.${s.republishOnPageOver}`;
    if (s.type === 'once') return 'Una volta';
    const h = s.intervalHours ?? 24;
    if (h % 24 === 0) return `Ogni ${h / 24} giorn${h / 24 === 1 ? 'o' : 'i'}`;
    return `Ogni ${h}h`;
  };

  const getStatusBadge = (s: Schedule) => {
    if (!s.active)
      return <span className="rounded px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 dark:bg-meta-4 dark:text-white">Completata</span>;
    if (s.paused)
      return <span className="rounded px-2 py-0.5 text-xs font-medium bg-warning text-white">In pausa</span>;
    if (s.type === 'watch')
      return <span className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-white">Monitoraggio</span>;
    return <span className="rounded px-2 py-0.5 text-xs font-medium bg-success text-white">Attiva</span>;
  };

  const inputClass =
    'w-full rounded border-[1.5px] border-stroke bg-transparent py-2.5 px-4 text-sm font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary';
  const smallInputClass =
    'rounded border border-stroke bg-transparent py-1 px-2 text-sm outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input';

  const MODE_OPTIONS: { value: 'once' | 'recurring' | 'watch'; label: string; desc: string }[] = [
    { value: 'once', label: 'Una volta', desc: "Inserisce l'annuncio a una data e ora precisa." },
    { value: 'recurring', label: 'Ricorrente', desc: 'Reinserisce automaticamente ogni N ore o giorni.' },
    { value: 'watch', label: 'Solo se fuori pagina', desc: "Nessun orario. Ripubblica solo se l'annuncio supera la soglia di pagina impostata." },
  ];

  return (
    <>
      <Breadcrumb pageName="Pianificazione" />
      <div className="flex flex-col gap-6">

        {/* Form nuova pianificazione */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">Nuova pianificazione</h3>
          </div>
          <div className="p-6 flex flex-col gap-5">

            {/* Nome */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                Nome <span className="font-normal text-gray-400">(opzionale)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Kawasaki mattina"
                className={inputClass}
              />
            </div>

            {/* Annunci */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Annunci</label>
              <div className="max-h-40 overflow-y-auto border border-stroke rounded p-2 dark:border-strokedark">
                {items.length === 0 && <p className="text-sm text-gray-500 p-1">Nessun annuncio disponibile</p>}
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 px-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-meta-4 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id!)}
                      onChange={() => handleToggleItem(item.id!)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-black dark:text-white">{item.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modalità */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Modalità</label>
              <div className="flex flex-col gap-2">
                {MODE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition ${
                      scheduleType === opt.value
                        ? 'border-primary bg-blue-50 dark:bg-meta-4'
                        : 'border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={scheduleType === opt.value}
                      onChange={() => setScheduleType(opt.value)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-black dark:text-white">{opt.label}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Campi per modalità */}
            {scheduleType === 'once' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Data e ora</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {scheduleType === 'recurring' && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Prima esecuzione</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className={inputClass}
                  />
                  {startAt && new Date(startAt) < new Date() && (
                    <p className="mt-1 text-xs text-warning">
                      Data passata — verrà anticipata al prossimo slot disponibile
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                    Ripeti ogni <span className="font-normal text-gray-400">(ore)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(parseInt(e.target.value) || 1)}
                      className={inputClass}
                    />
                    {intervalHours % 24 === 0 && (
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        = ogni {intervalHours / 24} giorn{intervalHours / 24 === 1 ? 'o' : 'i'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {scheduleType === 'watch' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                  Ripubblica se supera pagina
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={republishOnPageOver}
                  onChange={(e) => setRepublishOnPageOver(parseInt(e.target.value) || 1)}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Richiede l'aggiornamento stats periodico attivo nelle Impostazioni.
                </p>
              </div>
            )}

            <div>
              <button
                onClick={handleAddSchedule}
                className="rounded bg-primary py-2.5 px-6 text-sm font-medium text-gray hover:bg-opacity-90"
              >
                Aggiungi pianificazione
              </button>
            </div>
          </div>
        </div>

        {/* Lista pianificazioni */}
        {schedules.length > 0 && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">Pianificazioni ({schedules.length})</h3>
            </div>
            <div className="divide-y divide-stroke dark:divide-strokedark">
              {schedules.map((schedule) => {
                const scheduleItems = items.filter((i) => schedule.itemIds.includes(i.id!));
                const isEditing = editingId === schedule.id;
                const isRunning = runningNow.has(schedule.id);
                const historyExpanded = expandedHistory.has(schedule.id);

                return (
                  <React.Fragment key={schedule.id}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <input
                              type="text"
                              value={(editValues.name as string) ?? ''}
                              onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                              placeholder="Nome (opzionale)"
                              className={`${smallInputClass} mb-2`}
                            />
                          ) : (
                            <p className="font-medium text-sm text-black dark:text-white mb-1">
                              {schedule.name || scheduleItems.map((i) => i.title).join(', ') || '—'}
                            </p>
                          )}
                          {schedule.name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                              {scheduleItems.map((i) => i.title).join(', ')}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(schedule)}
                            <span className="text-xs bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 rounded px-2 py-0.5">
                              {describeSchedule(schedule)}
                            </span>
                            {schedule.type !== 'watch' && schedule.nextRun && schedule.active && (
                              <span className="text-xs text-gray-500">▶ {formatDate(schedule.nextRun)}</span>
                            )}
                            {schedule.lastRun && (
                              <span className="text-xs text-gray-400">Ultima: {formatDate(schedule.lastRun)}</span>
                            )}
                          </div>
                        </div>

                        {/* Azioni */}
                        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                          {schedule.active && !schedule.paused && (
                            <button
                              onClick={() => handleRunNow(schedule)}
                              disabled={isRunning}
                              className="rounded border border-primary px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-white transition disabled:opacity-50"
                            >
                              {isRunning ? 'In corso...' : 'Esegui ora'}
                            </button>
                          )}
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSaveEdit(schedule)} className="text-xs font-medium text-success hover:underline">Salva</button>
                              <button onClick={() => setEditingId(null)} className="text-xs font-medium text-gray-500 hover:underline">Annulla</button>
                            </>
                          ) : (
                            <button onClick={() => handleStartEdit(schedule)} className="text-xs font-medium text-black dark:text-white hover:underline">Modifica</button>
                          )}
                          {schedule.active && (
                            <button
                              onClick={() => handleTogglePause(schedule)}
                              className={`text-xs font-medium hover:underline ${schedule.paused ? 'text-success' : 'text-warning'}`}
                            >
                              {schedule.paused ? 'Riprendi' : 'Pausa'}
                            </button>
                          )}
                          <button onClick={() => handleDeleteSchedule(schedule.id)} className="text-xs font-medium text-danger hover:underline">
                            Elimina
                          </button>
                          {(schedule.history?.length ?? 0) > 0 && (
                            <button onClick={() => toggleHistory(schedule.id)} className="text-xs font-medium text-gray-500 hover:underline">
                              {historyExpanded ? 'Nascondi' : `Storico (${schedule.history!.length})`}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Modifica inline */}
                      {isEditing && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-meta-4 rounded flex flex-wrap gap-4 items-end">
                          {schedule.type === 'once' && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Data e ora</label>
                              <input
                                type="datetime-local"
                                value={(editValues.scheduledAt as string) || ''}
                                onChange={(e) => setEditValues((v) => ({ ...v, scheduledAt: e.target.value }))}
                                className={smallInputClass}
                              />
                            </div>
                          )}
                          {schedule.type === 'recurring' && (
                            <>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Prima esecuzione</label>
                                <input
                                  type="datetime-local"
                                  value={(editValues.startAt as string) || ''}
                                  onChange={(e) => setEditValues((v) => ({ ...v, startAt: e.target.value }))}
                                  className={smallInputClass}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Intervallo (ore)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={(editValues.intervalHours as number) || 24}
                                  onChange={(e) => setEditValues((v) => ({ ...v, intervalHours: parseInt(e.target.value) || 1 }))}
                                  className={`${smallInputClass} w-20`}
                                />
                              </div>
                            </>
                          )}
                          {(schedule.type === 'watch' || schedule.type === 'recurring') && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Soglia pagina</label>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={(editValues.republishOnPageOver as number) || 0}
                                onChange={(e) => setEditValues((v) => ({ ...v, republishOnPageOver: parseInt(e.target.value) || 0 }))}
                                className={`${smallInputClass} w-16`}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Storico */}
                    {historyExpanded && schedule.history && (
                      <div className="px-4 pb-3 bg-gray-50 dark:bg-meta-4">
                        <div className="flex flex-col gap-1 font-mono text-xs pt-2">
                          {[...schedule.history].reverse().map((h, i) => (
                            <div key={i} className={`flex gap-3 ${h.outcome === 'error' ? 'text-danger' : 'text-success'}`}>
                              <span className="text-gray-500 shrink-0">{formatDate(h.runAt)}</span>
                              <span>{h.outcome === 'success' ? '✓ Completata' : `✗ Errore${h.message ? ': ' + h.message : ''}`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default SchedulePage;
