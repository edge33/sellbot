import { useEffect, useState } from 'react';
import Breadcrumb from '@renderer/components/Breadcrumbs/Breadcrumb';
import type { Item } from '@shared/types';

const Trash = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  const load = async () => setItems(await window.getTrashItems());

  useEffect(() => { load(); }, []);

  const handleRestore = async (id: string) => {
    setLoadingId(id);
    try {
      await window.restoreItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setLoadingId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Eliminare definitivamente questo annuncio? Non sarà recuperabile.')) return;
    setLoadingId(id);
    try {
      await window.permanentlyDeleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setLoadingId(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Svuotare il cestino? Tutti gli annunci saranno eliminati definitivamente.')) return;
    setEmptyingTrash(true);
    try {
      const snapshot = [...items];
      for (const item of snapshot) {
        await window.permanentlyDeleteItem(item.id!);
      }
      setItems([]);
    } finally {
      setEmptyingTrash(false);
    }
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('it-IT') : '—';

  const daysLeft = (deletedAt?: string) => {
    if (!deletedAt) return 30;
    const elapsed = Date.now() - new Date(deletedAt).getTime();
    return Math.max(0, 30 - Math.floor(elapsed / (24 * 3600 * 1000)));
  };

  return (
    <>
      <Breadcrumb pageName="Cestino" />
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between py-6 px-4 md:px-6 xl:px-7.5">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Cestino {items.length > 0 && <span className="text-sm font-normal text-gray-500">({items.length})</span>}
          </h4>
          {items.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              disabled={emptyingTrash || !!loadingId}
              className={`rounded bg-danger py-1.5 px-4 text-sm font-medium text-white transition-opacity ${emptyingTrash || loadingId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-90'}`}
            >
              {emptyingTrash ? 'Eliminazione...' : 'Svuota cestino'}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-6 pb-8 text-sm text-gray-500 dark:text-gray-400">
            Il cestino è vuoto. Gli annunci eliminati vengono mantenuti per 30 giorni.
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="grid grid-cols-8 border-t border-stroke py-4 px-4 dark:border-strokedark md:px-6">
              <div className="col-span-3"><p className="font-medium">Annuncio</p></div>
              <div className="col-span-1"><p className="font-medium">Categoria</p></div>
              <div className="col-span-1"><p className="font-medium">Prezzo</p></div>
              <div className="col-span-1"><p className="font-medium">Eliminato il</p></div>
              <div className="col-span-1"><p className="font-medium">Scade tra</p></div>
              <div className="col-span-1"><p className="font-medium">Azioni</p></div>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-8 border-t border-stroke py-4 px-4 dark:border-strokedark md:px-6"
              >
                <div className="col-span-3 flex items-center gap-3">
                  {item.photos?.length ? (
                    <img
                      className="h-12 w-15 rounded object-cover"
                      src={`data:image/png;base64, ${item.photos[0]}`}
                      alt=""
                    />
                  ) : (
                    <div className="h-12 w-15 rounded bg-gray-100 dark:bg-meta-4" />
                  )}
                  <p className="text-sm text-black dark:text-white">{item.title}</p>
                </div>
                <div className="col-span-1 flex items-center">
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
                <div className="col-span-1 flex items-center">
                  <p className="text-sm text-black dark:text-white">€{item.price}</p>
                </div>
                <div className="col-span-1 flex items-center">
                  <p className="text-sm text-gray-500">{formatDate(item.deletedAt)}</p>
                </div>
                <div className="col-span-1 flex items-center">
                  <span className={`text-sm font-medium ${daysLeft(item.deletedAt) <= 3 ? 'text-danger' : 'text-gray-500'}`}>
                    {daysLeft(item.deletedAt)} giorni
                  </span>
                </div>
                <div className="col-span-1 flex items-center gap-3">
                  <button
                    onClick={() => handleRestore(item.id!)}
                    disabled={!!loadingId || emptyingTrash}
                    className={`text-sm font-medium text-success transition-opacity ${loadingId === item.id ? 'opacity-50' : loadingId || emptyingTrash ? 'opacity-40 cursor-not-allowed' : 'hover:underline'}`}
                  >
                    {loadingId === item.id ? '...' : 'Ripristina'}
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item.id!)}
                    disabled={!!loadingId || emptyingTrash}
                    className={`text-sm font-medium text-danger transition-opacity ${loadingId || emptyingTrash ? 'opacity-40 cursor-not-allowed' : 'hover:underline'}`}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-3 border-t border-stroke dark:border-strokedark">
          <p className="text-xs text-gray-400">Gli annunci nel cestino vengono eliminati automaticamente dopo 30 giorni.</p>
        </div>
      </div>
    </>
  );
};

export default Trash;
