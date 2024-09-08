import Breadcrumb from '@renderer/components/Breadcrumbs/Breadcrumb';
import ItemsTable from './components/ItemsTable';
import { useEffect, useState } from 'react';
import { Item } from '@shared/types';

const Products = () => {
  const [items, setItems] = useState<Item[]>();

  useEffect(() => {
    (async () => {
      const items = await window.getItems();
      setItems(items);
    })();
  }, []);

  return (
    <>
      <Breadcrumb pageName="Prodotti" />

      <div className="flex flex-col gap-10">{items && <ItemsTable items={items} />}</div>
    </>
  );
};

export default Products;
