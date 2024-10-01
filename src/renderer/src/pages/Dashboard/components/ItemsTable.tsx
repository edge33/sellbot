import PrimaryButton from '@renderer/ui/buttons/PrimaryButton';
import SecondaryButton from '@renderer/ui/buttons/SecondaryButton';
import TertiaryButton from '@renderer/ui/buttons/TertiaryButton';
import { Item } from '@shared/types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ItemsTableProps = {
  items: Item[];
};

const ItemsTable = ({ items }: ItemsTableProps) => {
  const [itemToDelete, setItemToDelete] = useState<string>();
  const [itemsToInsert, setItemsToInsert] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const handleInsertItemClick = async (filePath: string) => {
    await window.insertItems([filePath]);
  };

  const handleInsertAllItems = async () => {
    await window.insertItems(Array.from(itemsToInsert.values()));
  };

  const cloneItem = async (itemId: string) => {
    await window.cloneItem(itemId);
    return navigate(`/`);
  };

  const handleDeleteItem = async () => {
    if (itemToDelete) {
      await window.deleteItem(itemToDelete);
      return navigate(`/`);
    }
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
                <p className="text-sm text-black dark:text-white">{item.type}</p>
              </div>
              <div className="col-span-1 flex items-center">
                <p className="text-sm text-black dark:text-white">${item.price}</p>
              </div>
              <div className="col-span-2 flex items-center gap-7.5">
                {itemToDelete !== item.id && (
                  <button
                    className="hover:text-primary"
                    onClick={() => {
                      handleInsertItemClick(item.id as string);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                      className="fill-current"
                      width="18"
                      height="18"
                      fill="none"
                    >
                      <path d="M288 109.3V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V109.3l-73.4 73.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l128-128c12.5-12.5 32.8-12.5 45.3 0l128 128c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L288 109.3zM64 352h128c0 35.3 28.7 64 64 64s64-28.7 64-64h128c35.3 0 64 28.7 64 64v32c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64v-32c0-35.3 28.7-64 64-64zm368 104a24 24 0 100-48 24 24 0 100 48z"></path>
                    </svg>
                  </button>
                )}
                {itemToDelete === item.id ? (
                  <>
                    <SecondaryButton
                      action={() => {
                        handleDeleteItem();
                      }}
                      label="Conferma"
                    />
                    <TertiaryButton
                      action={() => {
                        setItemToDelete(undefined);
                      }}
                      label="Annulla"
                    />
                  </>
                ) : (
                  <>
                    <button
                      className="hover:text-primary"
                      onClick={() => {
                        setItemToDelete(item.id);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 448 512"
                        className="fill-current"
                        width="18"
                        height="18"
                        fill="none"
                      >
                        <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64s14.3 32 32 32h384c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32l21.2 339c1.6 25.3 22.6 45 47.9 45h245.8c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                      </svg>
                    </button>

                    <button
                      className="hover:text-primary"
                      onClick={() => {
                        cloneItem(item.id as string);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        className="fill-current"
                        width="18"
                        height="18"
                        fill="none"
                      >
                        <path d="M288 448H64V224h64v-64H64c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64h224c35.3 0 64-28.7 64-64v-64h-64v64zm-64-96h224c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H224c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64z"></path>
                      </svg>
                    </button>
                  </>
                )}
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
