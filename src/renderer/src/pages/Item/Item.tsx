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
  computerScienceCategory,
  itemSchema,
  CONDITION,
  SIZE,
  COMPUTER_SCIENCE_TYPE
} from './schema';
import getOptionsForCategory from './getOptionsForCategory';

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

  console.log({ item });

  const [selectedCategory, setSelectedCategory] = useState<CATEGORY>(item.category as CATEGORY);
  const [errors, setErrors] = useState<z.inferFormattedError<typeof itemSchema>>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    setErrors(undefined);
    event.preventDefault();

    const category = categoryRef?.current?.value;
    const title = titleRef?.current?.value;
    const description = descriptionRef?.current?.value;
    const price = parseInt(priceRef?.current?.value as string);
    const condition = conditionRef?.current?.value;
    const dimension = dimensionRef?.current?.value;
    const type = typeRef?.current?.value;

    const fileList = filePickerRef?.current?.files;
    let pics: string[] = [];
    if (fileList) {
      pics = Array.from(fileList).map(({ path }) => path);
    }

    console.log('got', { type });

    const update = {
      category,
      title,
      description,
      price,
      condition,
      dimension,
      ...(type && CATEGORIES_WITH_TYPE.includes(category as CATEGORY) ? { type } : {}),
      photos: pics
    };

    console.log('storing', { update });

    const result = itemSchema.safeParse(update);

    if (!result.success) {
      console.log(result.error.formErrors);
      setErrors(result.error.format());
      return;
    }

    const newItem = { ...update } as Item;

    if (item.id) {
      newItem.id = item.id;
    }
    const success = await window.updateItem({ ...update, id: item.id } as unknown as Item);
    if (success) {
      return navigate('/');
    } else {
      alert('Save failed, check logs');
    }
  };

  console.log({ errors });

  return (
    <>
      <Breadcrumb pageName="Prodotto" />

      <div className="flex flex-col gap-9">
        {/* <!-- Contact Form --> */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">{item.title}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="p-6.5">
              {/* CATEGORY */}

              <SelectInput
                ref={categoryRef}
                onChange={(event) => {
                  setSelectedCategory(event.target.value as CATEGORY);
                }}
                errors={errors?.category?._errors}
                label="Categoria"
                name="category"
                defaultValue={item.category}
              >
                <option value="" disabled className="text-body dark:text-bodydark">
                  Seleziona una categoria
                </option>
                <option value="10" className="text-body dark:text-bodydark">
                  Informatica
                </option>
                <option value="44" className="text-body dark:text-bodydark">
                  Console e videogiochi
                </option>
                <option value="11" className="text-body dark:text-bodydark">
                  Audio e video
                </option>
                <option value="40" className="text-body dark:text-bodydark">
                  Fotografia
                </option>
                <option value="12" className="text-body dark:text-bodydark">
                  Telefonia
                </option>
              </SelectInput>

              {/* CATEGORY */}

              <TextInput
                ref={titleRef}
                name="title"
                label="Titolo"
                defaultValue={item.title}
                placeholder="Titolo"
                errors={errors?.title?._errors}
                required
              />

              <TextArea
                ref={descriptionRef}
                label="Descrizione"
                name="description"
                defaultValue={item.description}
                placeholder="Descrizione oggetto"
                errors={errors?.description?._errors}
              />

              <TextInput
                ref={priceRef}
                name="price"
                defaultValue={item.price}
                placeholder="99"
                errors={errors?.price?._errors}
                label="Prezzo"
                required
                type="number"
              />

              {/* CONDITION */}

              <SelectInput
                ref={conditionRef}
                label="Condizione"
                name="condition"
                defaultValue={item.condition}
                errors={errors?.condition?._errors}
              >
                <option value="" disabled className="text-body dark:text-bodydark">
                  Seleziona condizione
                </option>
                <option value={CONDITION.NEW} className="text-body dark:text-bodydark">
                  Nuovo - mai usato in confezione originale
                </option>
                <option value={CONDITION.AS_NEW} className="text-body dark:text-bodydark">
                  Come nuovo - perfetto o ricondizionato
                </option>
                <option value={CONDITION.OPTIMAL} className="text-body dark:text-bodydark">
                  Ottimo - poco usato e ben conservato
                </option>
                <option value={CONDITION.GOOD} className="text-body dark:text-bodydark">
                  Buono - usato ma ben conservato
                </option>
                <option value={CONDITION.DAMAGED} className="text-body dark:text-bodydark">
                  Danneggiato - usato con parti guaste
                </option>
              </SelectInput>

              {/* CONDITION */}

              {/* DIMENSION */}

              <SelectInput
                ref={dimensionRef}
                label="Dimensione"
                name="dimension"
                defaultValue={item.dimension}
                errors={errors?.dimension?._errors}
              >
                <option value="" disabled className="text-body dark:text-bodydark">
                  Seleziona dimensione
                </option>
                <option value={SIZE.SMALL} className="text-body dark:text-bodydark">
                  Piccolo (Massimo 2kg)
                </option>
                <option value={SIZE.MEDIUM} className="text-body dark:text-bodydark">
                  Medio (Massimo 5kg)
                </option>
                <option value={SIZE.LARGE} className="text-body dark:text-bodydark">
                  Grande (Massimo 15kg)
                </option>
                <option value={SIZE.X_LARGE} className="text-body dark:text-bodydark">
                  Maxi (Massimo 20kg)
                </option>
              </SelectInput>

              {/* DIMENSION */}

              {/* TYPE */}

              {CATEGORIES_WITH_TYPE.includes(selectedCategory) && (
                <SelectInput
                  ref={typeRef}
                  label="Tipologia"
                  name="type"
                  defaultValue={item.type}
                  errors={
                    (errors as z.inferFormattedError<typeof computerScienceCategory>)?.type?._errors
                  }
                >
                  <option value="" disabled className="text-body dark:text-bodydark">
                    Seleziona una tipologia
                  </option>
                  {getOptionsForCategory(
                    selectedCategory as
                      | CATEGORY.COMPUTER_SCIENCE
                      | CATEGORY.AUDIO_VIDEO
                      | CATEGORY.SMARTPHONES
                  )}
                </SelectInput>
              )}

              {/* TYPE */}

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">Immagini</label>

                {item.photos && (
                  <div className="flex flex-wrap gap-2.5 justify-center">
                    {item.photos.map((pic, i) => (
                      <div className="mb-2.5 text-center" key={i}>
                        <img
                          className="w-full max-w-45"
                          src={`data:image/png;base64, ${pic}`}
                          alt="Product"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <input
                  name="pictures"
                  ref={filePickerRef}
                  multiple
                  type="file"
                  className="w-full rounded-md border border-stroke p-3 outline-none transition file:mr-4 file:rounded file:border-[0.5px] file:border-stroke file:bg-[#EEEEEE] file:py-1 file:px-2.5 file:text-sm focus:border-primary file:focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:file:border-strokedark dark:file:bg-white/30 dark:file:text-white"
                />
              </div>

              <button
                type="submit"
                className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
              >
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
