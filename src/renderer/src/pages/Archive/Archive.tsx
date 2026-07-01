import { useEffect, useState } from 'react';
import Breadcrumb from '@renderer/components/Breadcrumbs/Breadcrumb';
import type { Item } from '@shared/types';

const Archive = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = async () => {
    const all = await window.getItems();
    setItems(all.filter((i) => i.archived));
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (id: string) => {
    setLoadingId(id);
    try {
      await window.unarchiveItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('it-IT') : '—';

  return (
    <>
      <Breadcrumb pageName="Archivio" />
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between py-6 px-4 md:px-6 xl:px-7.5">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Archivio {items.length > 0 && <span className="text-sm font-normal text-gray-500">({items.length})</span>}
          </h4>
        </div>

        {items.length === 0 ? (
          <div className="px-6 pb-8 text-sm text-gray-500 dark:text-gray-400">
            Nessun annuncio archiviato. Gli annunci venduti che archivi da qui spariscono dalla dashboard ma restano salvati.
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="grid grid-cols-7 border-t border-stroke py-4 px-4 dark:border-strokedark md:px-6">
              <div className="col-span-3"><p className="font-medium">Annuncio</p></div>
              <div className="col-span-1"><p className="font-medium">Categoria</p></div>
              <div className="col-span-1"><p className="font-medium">Prezzo</p></div>
              <div className="col-span-1"><p className="font-medium">Archiviato il</p></div>
              <div className="col-span-1"><p className="font-medium">Azioni</p></div>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-7 border-t border-stroke py-4 px-4 dark:border-strokedark md:px-6"
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
                  <p className="text-sm text-gray-500">{formatDate(item.archivedAt)}</p>
                </div>
                <div className="col-span-1 flex items-center">
                  <button
                    onClick={() => handleRestore(item.id!)}
                    disabled={!!loadingId}
                    className={`text-sm font-medium text-success transition-opacity ${loadingId === item.id ? 'opacity-50' : loadingId ? 'opacity-40 cursor-not-allowed' : 'hover:underline'}`}
                  >
                    {loadingId === item.id ? '...' : 'Ripristina'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-3 border-t border-stroke dark:border-strokedark">
          <p className="text-xs text-gray-400">Gli annunci archiviati restano salvati indefinitamente finché non li ripristini.</p>
        </div>
      </div>
    </>
  );
};

export default Archive;
