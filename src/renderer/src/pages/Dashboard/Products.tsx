import Breadcrumb from '@renderer/components/Breadcrumbs/Breadcrumb';
import ItemsTable from './components/ItemsTable';
import { Item } from '@shared/types';
import { useLoaderData, useNavigate } from 'react-router-dom';
import PrimaryButton from '@renderer/ui/buttons/PrimaryButton';

export const loader = async () => {
  return await window.getItems();
};

const Products = () => {
  const itemsData = useLoaderData();
  const navigate = useNavigate();

  const items = itemsData as Item[];

  return (
    <>
      <Breadcrumb pageName="Prodotti" />

      <div className="flex flex-col gap-10">
        {items && <ItemsTable items={items} />}
        <div className="text-right">
          <PrimaryButton
            label="Nuovo oggetto"
            action={() => {
              navigate('/items/new-item/edit');
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Products;
