import Breadcrumb from '@renderer/components/Breadcrumbs/Breadcrumb';
import type { Item } from '@shared/types';
import { FormEvent, useRef, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import SelectInput from './components/SelectInput';
import TextInput from './components/TextInput';
import TextArea from './components/Textarea';
import {
  CATEGORY,
  CATEGORIES_WITH_TYPE,
  itemSchema,
  CONDITION,
  SIZE,
  COMPUTER_SCIENCE_TYPE
} from './schema';
import getOptionsForCategory from './getOptionsForCategory';

const MOTORI_CATEGORIES = ['2', '3', '4', '5', '22', '34', '36'];

export async function loader({ params }) {
  const item = await window.getItem(params.item);
  if (!item) {
    return {
      category: CATEGORY.COMPUTER_SCIENCE as string,
      condition: CONDITION.NEW as string,
      description: '',
      dimension: SIZE.SMALL as string,
      price: 0,
      title: '',
      type: COMPUTER_SCIENCE_TYPE.NOTEBOOK as string,
      filePath: ''
    } as Item;
  }
  return item;
}

const Item = () => {
  const navigate = useNavigate();
  const itemData = useLoaderData();
  const item = itemData as Item;

  const categoryRef = useRef<HTMLSelectElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const conditionRef = useRef<HTMLSelectElement>(null);
  const dimensionRef = useRef<HTMLSelectElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const trimRef = useRef<HTMLInputElement>(null);
  const mileageRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>(item.category as string);
  const [errors, setErrors] = useState<z.inferFormattedError<typeof itemSchema>>();

  const isMotori = MOTORI_CATEGORIES.includes(selectedCategory);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    setErrors(undefined);
    event.preventDefault();

    const category = categoryRef?.current?.value;
    const title = titleRef?.current?.value;
    const description = descriptionRef?.current?.value;
    const price = parseInt(priceRef?.current?.value as string);
    const fileList = filePickerRef?.current?.files;
    let pics: string[] = [];
    if (fileList) {
      pics = Array.from(fileList).map(({ path }) => path);
    }

    let update: Partial<Item> = { category, title, description, price, photos: pics };

    if (MOTORI_CATEGORIES.includes(category as string)) {
      update = {
        ...update,
        brand: brandRef?.current?.value,
        model: modelRef?.current?.value,
        trim: trimRef?.current?.value,
        mileage: mileageRef?.current?.value,
        year: yearRef?.current?.value,
        month: monthRef?.current?.value,
      };
    } else {
      const condition = conditionRef?.current?.value;
      const dimension = dimensionRef?.current?.value;
      const type = typeRef?.current?.value;
      update = {
        ...update,
        condition,
        dimension,
        ...(type && CATEGORIES_WITH_TYPE.includes(category as CATEGORY) ? { type } : {})
      };
    }

    const newItem = { ...update } as Item;
    if (item.id) newItem.id = item.id;

    const success = await window.updateItem({ ...update, id: item.id } as unknown as Item);
    if (success) {
      return navigate('/');
    } else {
      alert('Save failed, check logs');
    }
  };

  return (
    <>
      <Breadcrumb pageName="Prodotto" />
      <div className="flex flex-col gap-9">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">{item.title}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="p-6.5">

              {/* CATEGORIA */}
              <SelectInput
                ref={categoryRef}
                onChange={(event) => setSelectedCategory(event.target.value)}
                errors={errors?.category?._errors}
                label="Categoria"
                name="category"
                defaultValue={item.category}
              >
                <option value="" disabled>Seleziona una categoria</option>
                <optgroup label="Informatica">
                  <option value="10">Informatica</option>
                  <option value="44">Console e videogiochi</option>
                  <option value="11">Audio e video</option>
                  <option value="40">Fotografia</option>
                  <option value="12">Telefonia</option>
                </optgroup>
                <optgroup label="Motori">
                  <option value="2">Auto</option>
                  <option value="5">Accessori auto</option>
                  <option value="3">Moto e scooter</option>
                  <option value="36">Accessori moto</option>
                  <option value="22">Nautica</option>
                  <option value="34">Caravan e Camper</option>
                  <option value="4">Veicoli commerciali</option>
                </optgroup>
                <optgroup label="Casa">
                  <option value="14">Arredamento e Casalinghi</option>
                  <option value="37">Elettrodomestici</option>
                  <option value="15">Giardino e Fai da te</option>
                </optgroup>
              </SelectInput>

              <TextInput ref={titleRef} name="title" label="Titolo" defaultValue={item.title} placeholder="Titolo" required />
              <TextArea ref={descriptionRef} label="Descrizione" name="description" defaultValue={item.description} placeholder="Descrizione oggetto" />
              <TextInput ref={priceRef} name="price" defaultValue={item.price} placeholder="99" label="Prezzo" required type="number" />

              {/* CAMPI MOTORI */}
              {isMotori && (
                <>
                  <TextInput ref={brandRef} name="brand" label="Marca" defaultValue={item.brand} placeholder="Es. FIAT" required />
                  <TextInput ref={modelRef} name="model" label="Modello" defaultValue={item.model} placeholder="Es. Punto" required />
                  <TextInput ref={trimRef} name="trim" label="Allestimento" defaultValue={item.trim} placeholder="Es. Sport" required={false} />
                  <TextInput ref={mileageRef} name="mileage" label="Chilometraggio (km)" defaultValue={item.mileage} placeholder="Es. 50000" required type="number" />
                  <TextInput ref={yearRef} name="year" label="Anno di immatricolazione" defaultValue={item.year} placeholder="Es. 2018" required />
                  <TextInput ref={monthRef} name="month" label="Mese di immatricolazione" defaultValue={item.month} placeholder="Es. 3" required />
                </>
              )}

              {/* CAMPI INFORMATICA E SIMILI */}
              {!isMotori && (
                <>
                  <SelectInput ref={conditionRef} label="Condizione" name="condition" defaultValue={item.condition}>
                    <option value="" disabled>Seleziona condizione</option>
                    <option value={CONDITION.NEW}>Nuovo - mai usato in confezione originale</option>
                    <option value={CONDITION.AS_NEW}>Come nuovo - perfetto o ricondizionato</option>
                    <option value={CONDITION.OPTIMAL}>Ottimo - poco usato e ben conservato</option>
                    <option value={CONDITION.GOOD}>Buono - usato ma ben conservato</option>
                    <option value={CONDITION.DAMAGED}>Danneggiato - usato con parti guaste</option>
                  </SelectInput>

                  <SelectInput ref={dimensionRef} label="Dimensione" name="dimension" defaultValue={item.dimension}>
                    <option value="" disabled>Seleziona dimensione</option>
                    <option value={SIZE.SMALL}>Piccolo (Massimo 2kg)</option>
                    <option value={SIZE.MEDIUM}>Medio (Massimo 5kg)</option>
                    <option value={SIZE.LARGE}>Grande (Massimo 15kg)</option>
                    <option value={SIZE.X_LARGE}>Maxi (Massimo 20kg)</option>
                  </SelectInput>

                  {CATEGORIES_WITH_TYPE.includes(selectedCategory as CATEGORY) && (
                    <SelectInput ref={typeRef} label="Tipologia" name="type" defaultValue={item.type}>
                      <option value="" disabled>Seleziona una tipologia</option>
                      {getOptionsForCategory(selectedCategory as CATEGORY.COMPUTER_SCIENCE | CATEGORY.AUDIO_VIDEO | CATEGORY.SMARTPHONES)}
                    </SelectInput>
                  )}
                </>
              )}

              {/* IMMAGINI */}
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">Immagini</label>
                {item.photos && (
                  <div className="flex flex-wrap gap-2.5 justify-center">
                    {item.photos.map((pic, i) => (
                      <div className="mb-2.5 text-center" key={i}>
                        <img className="w-full max-w-45" src={`data:image/png;base64, ${pic}`} alt="Product" />
                      </div>
                    ))}
                  </div>
                )}
                <input name="pictures" ref={filePickerRef} multiple type="file"
                  className="w-full rounded-md border border-stroke p-3 outline-none transition file:mr-4 file:rounded file:border-[0.5px] file:border-stroke file:bg-[#EEEEEE] file:py-1 file:px-2.5 file:text-sm focus:border-primary file:focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:file:border-strokedark dark:file:bg-white/30 dark:file:text-white"
                />
              </div>

              <button type="submit" className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90">
                Salva
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Item;
