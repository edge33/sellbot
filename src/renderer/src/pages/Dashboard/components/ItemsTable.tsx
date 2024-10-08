import PrimaryButton from '@renderer/ui/buttons/PrimaryButton';
import { Item } from '@shared/types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActionButtons from './ActionButtons';

const getItemCategory = (category: string) => {
  switch (category) {
    case '10': {
      return 'Informatica';
    }
    case '44': {
      return 'Console e videogiochi';
    }
    case '11': {
      return 'Audio e video';
    }
    case '40': {
      return 'Fotografia';
    }
    case '12': {
      return 'Telefonia';
    }
  }
  return '';
};

type ItemsTableProps = {
  items: Item[];
};

const ItemsTable = ({ items }: ItemsTableProps) => {
  const [itemsToInsert, setItemsToInsert] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const handleInsertItemClick = async (filePath: string) => {
    await window.insertItems([filePath]);
  };

  const handleInsertAllItems = async () => {
    await window.insertItems(Array.from(itemsToInsert.values()));
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
    await window.removeListings([itemId]);
  };

  const allSelected = items.every(({ id }) => itemsToInsert.has(id as string));

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="py-6 px-4 md:px-6 xl:px-7.5">
          <h4 className="text-xl font-semibold text-black dark:text-white">Prodotti</h4>
        </div>
        <div className="max-w-full overflow-x-auto">
          <div className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5">
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
            <div className="col-span-2 flex items-center">
              <p className="font-medium">Azioni</p>
            </div>
          </div>

          {items.map((item, key) => (
            <div
              className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5"
              key={key}
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
                <p className="text-sm text-black dark:text-white">${item.price}</p>
              </div>
              <div className="col-span-2 flex items-center gap-7.5">
                <ActionButtons
                  itemId={item.id as string}
                  cloneItem={handleCloneItem}
                  insertItem={handleInsertItemClick}
                  deleteItem={handleDeleteItem}
                  removeListing={handleRemoveListing}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="py-6 px-4 md:px-6 xl:px-7.5">
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
                  checked={true}
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
            action={() => {
              handleInsertAllItems();
            }}
            label="Inserisci selezionati"
          />
        </div>
      </div>
    </>
  );
};

export default ItemsTable;
