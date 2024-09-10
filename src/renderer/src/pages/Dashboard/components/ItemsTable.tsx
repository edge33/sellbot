import PrimaryButton from '@renderer/ui/buttons/PrimaryButton';
import SecondaryButton from '@renderer/ui/buttons/SecondaryButton';
import TertiaryButton from '@renderer/ui/buttons/TertiaryButton';
import { Item } from '@shared/types';
import { useState } from 'react';

type ItemsTableProps = {
  items: Item[];
};

const ItemsTable = ({ items }: ItemsTableProps) => {
  const [itemToDelete, setItemToDelete] = useState<string>();

  const handleInsertItemClick = (filePath: string) => {
    window.insertItem(filePath);
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="py-6 px-4 md:px-6 xl:px-7.5">
        <h4 className="text-xl font-semibold text-black dark:text-white">Prodotti</h4>
      </div>

      <div className="max-w-full overflow-x-auto">
        <div className="grid grid-cols-6 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5">
          <div className="col-span-3 flex items-center">
            <p className="font-medium">Titolo</p>
          </div>
          <div className="col-span-2 hidden items-center sm:flex">
            <p className="font-medium">Categoria</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Prezzo</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Azioni</p>
          </div>
        </div>

        {items.map((item, key) => (
          <div
            className="grid grid-cols-6 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5"
            key={key}
          >
            <div className="col-span-3 flex items-center">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-12.5 w-15 rounded-md">
                  <img
                    className="max-w-full max-h-full"
                    src={`data:image/png;base64, ${item.photos[0]}`}
                    alt="Product"
                  />
                </div>
                <p className="text-sm text-black dark:text-white">{item.title}</p>
              </div>
            </div>
            <div className="col-span-2 hidden items-center sm:flex">
              <p className="text-sm text-black dark:text-white">{item.type}</p>
            </div>
            <div className="col-span-1 flex items-center">
              <p className="text-sm text-black dark:text-white">${item.price}</p>
            </div>
            <div className="col-span-1 flex items-center flex gap-7.5">
              {itemToDelete !== `${key}` && (
                <PrimaryButton
                  action={() => handleInsertItemClick(item.filePath)}
                  label="Inserisci"
                />
              )}
              {itemToDelete === `${key}` ? (
                <>
                  <SecondaryButton
                    action={() => {
                      alert('feature coming soon..');
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
                <TertiaryButton
                  action={() => {
                    setItemToDelete(`${key}`);
                  }}
                  label="Elimina"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemsTable;
