import PrimaryButton from '@renderer/ui/buttons/PrimaryButton';
import { Item } from '@shared/types';
import { useState } from 'react';
import { useNavigate, useRevalidator } from 'react-router-dom';
import ActionButtons from './ActionButtons';

const getItemCategory = (category: string) => {
  switch (category) {
    case '2': return 'Auto';
    case '3': return 'Moto e scooter';
    case '4': return 'Veicoli commerciali';
    case '5': return 'Accessori auto';
    case '10': return 'Informatica';
    case '11': return 'Audio e video';
    case '12': return 'Telefonia';
    case '14': return 'Arredamento e Casalinghi';
    case '15': return 'Giardino e Fai da te';
    case '16': return 'Abbigliamento e Accessori';
    case '17': return 'Tutto per i bambini';
    case '19': return 'Musica e Film';
    case '20': return 'Sports';
    case '21': return 'Collezionismo';
    case '22': return 'Nautica';
    case '23': return 'Animali';
    case '34': return 'Caravan e Camper';
    case '36': return 'Accessori moto';
    case '37': return 'Elettrodomestici';
    case '38': return 'Libri e Riviste';
    case '39': return 'Strumenti Musicali';
    case '40': return 'Fotografia';
    case '41': return 'Biciclette';
    case '44': return 'Console e videogiochi';
    case '100': return 'Accessori per animali';
    default: return '';
  }
};
type ItemsTableProps = {
  items: Item[];
};

const ItemsTable = ({ items }: ItemsTableProps) => {
  const [itemsToInsert, setItemsToInsert] = useState<Set<string>>(new Set());
  const [loadingOp, setLoadingOp] = useState<string | null>(null);
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

  const withLoading = async (label: string, fn: () => Promise<void>) => {
    setLoadingOp(label);
    try {
      await fn();
    } finally {
      setLoadingOp(null);
    }
  };

  const handleInsertItemClick = async (filePath: string) => {
    await withLoading('Inserimento annuncio...', async () => {
      await window.insertItems([filePath]);
      revalidate();
    });
  };

  const handleInsertAllItems = async () => {
    await withLoading('Inserimento annunci...', async () => {
      await window.insertItems(Array.from(itemsToInsert.values()));
      revalidate();
    });
  };

  const handleCloneItem = async (itemId: string) => {
    await window.cloneItem(itemId);
    return navigate(`/`);
  };

  const handleDeleteItem = async (itemId: string) => {
    await window.deleteItem(itemId);
    return navigate(`/`);
  };

  const handleRemoveListing = async (itemId: string) => {
    await withLoading('Rimozione annuncio...', async () => {
      await window.removeListings([itemId]);
      revalidate();
    });
  };

  const handleRemoveAllListings = async () => {
    await withLoading('Rimozione annunci...', async () => {
      await window.removeListings(Array.from(itemsToInsert.values()));
      revalidate();
    });
  };

  const handleCheckAllStatus = async () => {
    await withLoading('Controllo stato annunci...', async () => {
      const allIds = items.map(({ id }) => id as string);
      await window.checkItemsStatus(allIds);
      revalidate();
    });
  };

  const handleFetchStats = async () => {
    const allIds = items.filter((i) => i.id).map((i) => i.id as string);
    if (allIds.length === 0) return;
    await withLoading('Aggiornamento stats...', async () => {
      await window.fetchItemsStats(allIds);
      revalidate();
    });
  };

  const allSelected = items.every(({ id }) => itemsToInsert.has(id as string));

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="py-6 px-4 md:px-6 xl:px-7.5">
          <h4 className="text-xl font-semibold text-black dark:text-white">Prodotti</h4>
        </div>
        <div className="max-w-full overflow-x-auto">
          <div className="grid grid-cols-11 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-11 md:px-6 2xl:px-7.5">
            <div className="col-span-1 flex items-center">
              <p className="font-medium">Selezione</p>
            </div>
            <div className="col-span-3 flex items-center">
              <p className="font-medium">Titolo</p>
            </div>
            <div className="col-span-1 hidden items-center sm:flex">
              <p className="font-medium">Categoria</p>
            </div>
            <div className="col-span-1 flex items-center">
              <p className="font-medium">Prezzo</p>
            </div>
            <div className="col-span-1 flex items-center">
              <p className="font-medium">Stato</p>
            </div>
            <div className="col-span-2 flex items-center">
              <p className="font-medium">Stats</p>
            </div>
            <div className="col-span-2 flex items-center">
              <p className="font-medium">Azioni</p>
            </div>
          </div>

          {items.map((item) => (
            <div
              className="grid grid-cols-11 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-11 md:px-6 2xl:px-7.5"
              key={item.id}
            >
              <div className="col-span-1 flex items-center justify-center">
                <div>
                  <label
                    htmlFor={`checkboxLabel-${item.id}`}
                    className="flex cursor-pointer select-none items-center"
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        id={`checkboxLabel-${item.id}`}
                        className="sr-only"
                        onChange={(event) => {
                          const newValue = event.target.value;
                          const newItemstoInsert = new Set(itemsToInsert);
                          if (newItemstoInsert.has(newValue)) {
                            newItemstoInsert.delete(newValue);
                          } else {
                            newItemstoInsert.add(newValue);
                          }
                          setItemsToInsert(newItemstoInsert);
                        }}
                        value={item.id}
                        checked={itemsToInsert?.has(item.id as string)}
                      />
                      <div
                        className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                          itemsToInsert?.has(item.id as string) &&
                          'border-primary bg-gray dark:bg-transparent'
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-sm ${itemsToInsert?.has(item.id as string) && 'bg-primary'}`}
                        ></span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div
                onClick={() => {
                  return navigate(`/items/${item.id}/edit`);
                }}
                className=" cursor-pointer col-span-3 flex items-center"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="h-12.5 w-15 rounded-md">
                    {item.photos?.length ? (
                      <img
                        className="max-w-full max-h-full"
                        src={`data:image/png;base64, ${item.photos[0]}`}
                        alt="Product"
                      />
                    ) : (
                      <span>no picture...</span>
                    )}
                  </div>
                  <p className="text-sm text-black dark:text-white">{item.title}</p>
                </div>
              </div>
              <div className="col-span-1 hidden items-center sm:flex">
                <p className="text-sm text-black dark:text-white">
                  {getItemCategory(item.category)}
                </p>
              </div>
              <div className="col-span-1 flex items-center">
                <p className="text-sm text-black dark:text-white">€{item.price}</p>
              </div>
              <div className="col-span-1 flex items-center">
                {item.isOnline === true ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-xs font-medium text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white"></span>Online
                  </span>
                ) : item.isOnline === false ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-xs font-medium text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white"></span>Offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-meta-4 dark:text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500"></span>—
                  </span>
                )}
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                {item.stats ? (
                  <>
                    <div className="flex items-center gap-3">
                      {item.stats.position && (
                        <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                          item.stats.position === '1°' ? 'bg-success text-white' :
                          ['2°', '3°'].includes(item.stats.position) ? 'bg-warning text-white' :
                          'bg-danger text-white'
                        }`}>
                          📄 {item.stats.position}
                        </span>
                      )}
                      {item.stats.views !== undefined && (
                        <span className="text-sm text-black dark:text-white">👁 {item.stats.views}</span>
                      )}
                      {item.stats.messages !== undefined && (
                        <span className="text-sm text-black dark:text-white">✉ {item.stats.messages}</span>
                      )}
                    </div>
                    {item.stats.lastChecked && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {(() => {
                          const diff = Math.floor((Date.now() - new Date(item.stats.lastChecked).getTime()) / 60000);
                          if (diff < 1) return 'aggiornato ora';
                          if (diff < 60) return `aggiornato ${diff} min fa`;
                          const h = Math.floor(diff / 60);
                          if (h < 24) return `aggiornato ${h}h fa`;
                          return `aggiornato il ${new Date(item.stats.lastChecked).toLocaleDateString('it-IT')}`;
                        })()}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-7.5">
                <ActionButtons
                  itemId={item.id as string}
                  cloneItem={handleCloneItem}
                  insertItem={handleInsertItemClick}
                  deleteItem={handleDeleteItem}
                  removeListing={handleRemoveListing}
                  disabled={!!loadingOp}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="py-6 px-4 md:px-6 xl:px-7.5">
        {loadingOp && (
          <div className="flex items-center gap-2 mb-4 text-sm text-white bg-meta-3 rounded-md px-4 py-2 w-fit">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {loadingOp}
          </div>
        )}
        <div className="flex items-left items-center gap-7.5">
          <div>
            <label
              htmlFor={`checkboxLabel-all`}
              className="flex cursor-pointer select-none items-center"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  id={`checkboxLabel-all`}
                  className="sr-only"
                  onChange={() => {
                    if (allSelected) {
                      setItemsToInsert(new Set());
                      return;
                    }
                    const newItemstoInsert = new Set(items.map(({ id }) => id as string));
                    setItemsToInsert(newItemstoInsert);
                  }}
                  checked={allSelected}
                />
                <div
                  className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                    allSelected && 'border-primary bg-gray dark:bg-transparent'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-sm ${allSelected && 'bg-primary'}`}></span>
                </div>
              </div>
              Seleziona tutti
            </label>
          </div>
          <PrimaryButton
            action={() => { handleInsertAllItems(); }}
            label="Inserisci selezionati"
            disabled={!!loadingOp}
          />
          <PrimaryButton
            action={() => { handleRemoveAllListings(); }}
            label="Elimina selezionati"
            disabled={!!loadingOp}
          />
          <PrimaryButton
            action={() => { handleCheckAllStatus(); }}
            label="Controlla stato annunci"
            disabled={!!loadingOp}
          />
          <PrimaryButton
            action={() => { handleFetchStats(); }}
            label="Aggiorna stats"
            disabled={!!loadingOp}
          />
        </div>
      </div>
    </>
  );
};

export default ItemsTable;
