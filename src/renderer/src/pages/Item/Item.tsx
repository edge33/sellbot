import Breadcrumb from '@renderer/components/Breadcrumbs/Breadcrumb';
import type { Item, DescriptionSettings } from '@shared/types';
import { FormEvent, useRef, useState, useEffect } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { useSettingsContext } from '@renderer/Context/context';
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
import { fetchCategoryConfig } from './subitoApi';
import { AUTO_BRANDS, MOTO_BRANDS } from './carData';

const MOTORI_CATEGORIES = ['2', '3', '4', '22', '34'];

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

const CONDITION_DESCRIPTIONS: Record<string, string> = {
  '0': 'nuovo, mai usato, in confezione originale',
  '1': 'come nuovo, praticamente perfetto',
  '2': 'in ottimo stato, poco usato',
  '3': 'in buono stato, usato ma ben conservato',
  '4': 'con qualche difetto o parte danneggiata'
};

const buildDescriptionPrompt = (
  title: string,
  category: string,
  brand: string | undefined,
  model: string | undefined,
  condition: string | undefined,
  ds: DescriptionSettings | undefined,
  keySpecs: string[] = [],
  productName?: string
): { prompt: string; systemMessage: string; extra: string | undefined } => {
  const s = ds?.sections;
  const tone = ds?.tone ?? 'neutro';
  const length = ds?.length ?? 'media';
  const extra = ds?.extraInstructions?.trim();

  const lengthMap = { breve: 'MASSIMO 60 parole (rispetta strettamente questo limite)', media: 'MASSIMO 150 parole (rispetta strettamente questo limite)', dettagliata: 'MASSIMO 300 parole (rispetta strettamente questo limite)' };
  const maxSpecsMap = { breve: 4, media: 7, dettagliata: 99 };
  keySpecs = keySpecs.slice(0, maxSpecsMap[length]);
  const toneMap = {
    neutro: '',
    formale: 'Usa un tono formale e professionale.',
    colloquiale: 'Usa un tono colloquiale e amichevole.',
    vendita: 'Usa un tono persuasivo e orientato alla vendita.',
    privato: 'Scrivi come un privato che vende un suo oggetto: tono diretto, semplice e genuino. Niente frasi da negozio o marketing. Come se lo descrivessi a un amico.'
  };

  const rules: string[] = [];
  if (!s || s.intro) rules.push('Inizia con "Vendo [nome prodotto],"');
  if (!s || s.specs) {
    if (keySpecs.length > 0) {
      rules.push(`Includi queste specifiche tecniche verificate (usale esattamente, non aggiungerne altre inventate): ${keySpecs.join(', ')}`);
    } else {
      rules.push(`Descrivi i punti di forza e utilizzi pratici. Se nel titolo "${title}" sono indicate specifiche (es. GB RAM, storage), includile. NON inventare dati tecnici non presenti.`);
    }
  }
  if (!s || s.usage) rules.push('Descrivi gli utilizzi pratici');
  if (s?.condition) {
    const condDesc = condition ? CONDITION_DESCRIPTIONS[condition] : undefined;
    rules.push(condDesc
      ? `Menziona brevemente lo stato del prodotto in modo naturale (è ${condDesc})`
      : 'Menziona brevemente lo stato del prodotto');
  }
  if (s?.shipping) rules.push('Aggiungi informazioni su spedizione o possibilità di ritiro');
  if (s?.cta) rules.push('Termina con una call to action (es. "Contattami per info o offerte")');
  if (!s?.condition) rules.push('NON includere frasi sullo stato (nuovo, usato, ottime condizioni, ecc.)');
  if (!s?.cta) rules.push('NON includere prezzi, contatti o call to action');
  if (toneMap[tone]) rules.push(toneMap[tone]);

  const resolvedName = productName || title;
  const prompt = `${extra ? `ISTRUZIONI OBBLIGATORIE (priorità massima, rispettale sempre):\n${extra}\n\n` : ''}Scrivi una descrizione per un annuncio su Subito.it con queste informazioni:
- Prodotto: ${resolvedName}
${brand ? `- Marca: ${brand}` : ''}
${model ? `- Modello: ${model}` : ''}

Regole:
- In italiano
- ${lengthMap[length]}
${rules.map((r) => `- ${r}`).join('\n')}
Rispondi SOLO con la descrizione, senza introduzioni.`;

  const baseSystem = 'Sei un assistente che scrive descrizioni per annunci. REGOLA FONDAMENTALE: non inventare mai specifiche tecniche, caratteristiche, versioni o dettagli che non ti sono stati forniti esplicitamente. Usa solo le informazioni presenti nel messaggio.';
  const systemMessage = extra
    ? `${baseSystem} Istruzioni aggiuntive: ${extra}`
    : baseSystem;

  return { prompt, systemMessage, extra };
};

const Item = () => {
  const navigate = useNavigate();
  const itemData = useLoaderData();
  const item = itemData as Item;
  const { appSettings } = useSettingsContext();

  const categoryRef = useRef<HTMLSelectElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const conditionRef = useRef<HTMLSelectElement>(null);
  const dimensionRef = useRef<HTMLSelectElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLSelectElement>(null);
  const modelRef = useRef<HTMLSelectElement>(null);
  const trimRef = useRef<HTMLSelectElement>(null);
  const mileageRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>(item.category as string);
  const [errors, setErrors] = useState<z.inferFormattedError<typeof itemSchema>>();
  const [models, setModels] = useState<{value: string, label: string}[]>([]);
  const [trims, setTrims] = useState<{value: string, label: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(item.model || '');
  const [userId, setUserId] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<{ source: 'subito' | 'ai'; min: number; max: number; avg: number; count: number; url?: string; detail?: string } | null>(null);
  const [priceRangeLoading, setPriceRangeLoading] = useState(false);
  const [descLoading, setDescLoading] = useState(false);
  const [ean, setEan] = useState<string>(item.ean || '');
  const [eanProduct, setEanProduct] = useState<{ title: string; description: string } | null>(null);
  const [eanSearching, setEanSearching] = useState(false);

  const isMotori = MOTORI_CATEGORIES.includes(selectedCategory);

  useEffect(() => {
    if (isMotori) {
      window.getCookies().then((data: any) => {
        if (data?.userId) {
          setUserId(data.userId);
        }
      });
    }
  }, [isMotori, selectedCategory]);

  // Carica modelli e trim per item già esistenti con brand/model impostati
  useEffect(() => {
    if (!userId || !isMotori || !item.brand) return;
    fetchCategoryConfig(userId, selectedCategory, item.brand).then((config) => {
      setModels(config.models || []);
      if (item.model) {
        setSelectedModel(item.model);
        fetchCategoryConfig(userId, selectedCategory, item.brand!, item.model).then((config2) => {
          setTrims(config2.trims || []);
        });
      }
    });
  }, [userId]);

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

    let update: Partial<Item> = { category, title, description, price, photos: pics, ean: ean || undefined };

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

              <TextInput ref={titleRef} name="title" label="Titolo" defaultValue={item.title} placeholder="Titolo (min 5, max 50 caratteri)" required minLength={5} maxLength={50} />
              <div className="mb-4.5">
  <TextArea ref={descriptionRef} label="Descrizione" name="description" defaultValue={item.description} placeholder="Descrizione oggetto" />
  <button
    type="button"
    onClick={async () => {
      const title = titleRef?.current?.value;
      const category = categoryRef?.current?.value;
      const brandCode = brandRef?.current?.value;
      const modelCode = modelRef?.current?.value;
      // Risolvi codici → label leggibili
      const allBrands = [...AUTO_BRANDS, ...MOTO_BRANDS];
      const brandLabel = brandCode ? (allBrands.find(b => b.value === brandCode)?.label ?? brandCode) : undefined;
      const modelLabel = modelCode ? (models.find(m => m.value === modelCode)?.label ?? modelCode) : undefined;
      // Non passare marca/modello se sono già nel titolo (evita ripetizioni)
      const titleLower = title?.toLowerCase() ?? '';
      const brand = (brandLabel && !titleLower.includes(brandLabel.toLowerCase())) ? brandLabel : undefined;
      const model = (modelLabel && !titleLower.includes(modelLabel.toLowerCase())) ? modelLabel : undefined;
      if (!title) { alert('Inserisci prima il titolo!'); return; }
      const condition = conditionRef?.current?.value;
      setDescLoading(true);
      try {
        // Cerca specs su DuckDuckGo via extractProductInfo
        let keySpecs: string[] = [];
        let productName: string | undefined;
        try {
          const info = await window.extractProductInfo(title);
          if (info) {
            // Estrai numeri+unità dal titolo (es. "6gb" → "6", "128gb" → "128")
            const titleNumbers = new Set(
              [...(title.matchAll(/(\d+)\s*(gb|mb|tb|ghz|mhz)/gi))].map(m => m[1])
            );
            // Per specs con varianti multiple, tenta di risolvere con i valori del titolo
            const isMultiVariant = (s: string) =>
              /\b(o|or|oppure)\b/i.test(s) ||
              /\d+\s*\/\s*\d+/.test(s) ||
              /\d+\s*(GB|MB|TB|GHz|MHz)\s*,\s*\d+/i.test(s);

            // Risolvi specs multi-variante usando i valori nel titolo
            keySpecs = info.keySpecs.map(s => {
              if (!isMultiVariant(s)) return s;
              const prefixMatch = s.match(/^([^0-9]+)/);
              const prefix = prefixMatch ? prefixMatch[1] : '';
              const allNums = [...s.matchAll(/(\d+)\s*(GB|MB|TB|GHz|MHz)/gi)];
              const matched = allNums.filter(m => titleNumbers.has(m[1]));
              if (matched.length > 0) return prefix + matched[0][1] + ' ' + matched[0][2].toUpperCase();
              return null;
            }).filter((s): s is string => s !== null);

            // Rimuovi specs RAM/storage dal web se contraddicono il titolo (variante sbagliata)
            const titleLower = title.toLowerCase();
            const ramMatch = titleLower.match(/(\d+)\s*gb\s*ram/i) || titleLower.match(/ram\s*(\d+)\s*gb/i);
            const storageMatches = [...titleLower.matchAll(/(\d+)\s*gb/gi)].map(m => parseInt(m[1])).filter(n => n >= 32);
            const ramVal = ramMatch ? parseInt(ramMatch[1]) : null;
            const storageVal = ramVal ? storageMatches.find(n => n !== ramVal) ?? null : storageMatches[0] ?? null;
            if (ramVal !== null || storageVal !== null) {
              keySpecs = keySpecs.filter(s => {
                const sl = s.toLowerCase();
                const isRamSpec = /\bram\b/.test(sl) || /memoria\s*ram/.test(sl);
                const isStorageSpec = /memoria\s*interna/.test(sl) || /\bstorage\b/.test(sl);
                if (isRamSpec && ramVal !== null && !sl.includes(`${ramVal} gb`)) return false;
                if (isStorageSpec && storageVal !== null && !sl.includes(`${storageVal} gb`)) return false;
                return true;
              });
            }
            // Aggiungi RAM/storage dal titolo se non ancora presenti
            const specsText = keySpecs.join(' ').toLowerCase();
            if (ramVal && !specsText.includes(`${ramVal} gb`)) keySpecs.push(`RAM: ${ramVal} GB`);
            if (storageVal && !specsText.includes(`${storageVal} gb`)) keySpecs.push(`Memoria interna: ${storageVal} GB`);

            productName = info.productName;
          }
        } catch { /* procedi senza specs */ }

        const { prompt, systemMessage, extra } = buildDescriptionPrompt(title, category ?? '', brand, model, condition, appSettings.descriptionSettings, keySpecs, productName);
        console.log('[Item] prompt (first 300):', prompt.substring(0, 300));

        const generatedText = await window.generateDescription(prompt, systemMessage);
        if (generatedText && descriptionRef.current) {
          descriptionRef.current.value = extra ? `${generatedText}\n\n${extra}` : generatedText;
        } else if (!generatedText) {
          alert('Chiave API non configurata o non valida. Vai nelle Impostazioni.');
        }
      } catch (err) {
        alert('Errore nella generazione della descrizione');
        console.error(err);
      } finally {
        setDescLoading(false);
      }
    }}
    disabled={descLoading}
    className="mt-2 flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90 disabled:opacity-60"
  >
    {descLoading ? 'Identifico prodotto...' : '✨ Genera descrizione con AI'}
  </button>
</div>
              {/* EAN */}
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">EAN / Barcode <span className="text-gray-400 font-normal text-sm">(opzionale)</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ean}
                    onChange={(e) => { setEan(e.target.value); setEanProduct(null); }}
                    placeholder="Es. 0730143314718"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  />
                  <button
                    type="button"
                    disabled={eanSearching}
                    onClick={async () => {
                      const t = titleRef?.current?.value;
                      if (!t?.trim()) { alert('Inserisci prima il titolo!'); return; }
                      setEanSearching(true);
                      setEanProduct(null);
                      try {
                        const found = await window.searchEanByTitle(t);
                        if (found) {
                          setEan(found.ean || '');
                          setEanProduct({ title: found.title, description: found.description });
                        } else {
                          alert('Nessun prodotto trovato. Inserisci l\'EAN manualmente.');
                        }
                      } catch { alert('Errore durante la ricerca EAN'); }
                      finally { setEanSearching(false); }
                    }}
                    className="shrink-0 rounded bg-primary py-2 px-4 font-medium text-gray hover:bg-opacity-90 disabled:opacity-60 text-sm whitespace-nowrap"
                  >
                    {eanSearching ? 'Ricerca...' : '🔍 Cerca EAN'}
                  </button>
                </div>
                {eanProduct && (
                  <p className="mt-1.5 text-sm text-meta-3 dark:text-meta-3">
                    ✓ Prodotto trovato: <span className="font-medium">{eanProduct.title}</span>
                  </p>
                )}
              </div>

              <TextInput ref={priceRef} name="price" defaultValue={item.price} placeholder="99" label="Prezzo" required type="number" />

              {/* RIQUADRO PREZZI MERCATO */}
              <div className="mb-4.5">
                <button
                  type="button"
                  onClick={async () => {
                    const title = titleRef?.current?.value;
                    const category = categoryRef?.current?.value;
                    if (!title?.trim()) { alert('Inserisci prima il titolo!'); return; }
                    setPriceRangeLoading(true);
                    setPriceRange(null);
                    try {
                      const result = await window.fetchPriceRange(title, category || selectedCategory);
                      setPriceRange(result);
                    } catch { setPriceRange(null); }
                    finally { setPriceRangeLoading(false); }
                  }}
                  className="flex items-center gap-2 rounded bg-meta-3 py-2 px-4 font-medium text-white hover:bg-opacity-90 text-sm"
                >
                  {priceRangeLoading ? (
                    <span>Ricerca in corso...</span>
                  ) : (
                    <span>Cerca prezzi di mercato</span>
                  )}
                </button>
                {priceRange && (
                  <div className={`mt-3 rounded-sm border px-5 py-4 ${priceRange.source === 'subito' ? 'border-[#3CA745] bg-[#3CA745] bg-opacity-10' : 'border-primary bg-primary bg-opacity-10'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-black dark:text-white">Prezzi di mercato</span>
                      <div className="flex items-center gap-2">
                        {priceRange.url && (
                          <button
                            type="button"
                            title={priceRange.source === 'subito' ? 'Apri ricerca su Subito' : 'Cerca su Google'}
                            onClick={() => window.openExternal(priceRange.url!)}
                            className="text-gray-500 hover:text-primary transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </button>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${priceRange.source === 'subito' ? 'bg-[#3CA745] text-white' : 'bg-primary text-white'}`}>
                          {priceRange.source === 'subito' ? `Subito (${priceRange.count} annunci)` : 'Stima AI (Groq)'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-6 mt-2">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Minimo</div>
                        <div className="text-lg font-bold text-black dark:text-white">€{priceRange.min.toLocaleString('it-IT')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Media</div>
                        <div className="text-lg font-bold text-primary">€{priceRange.avg.toLocaleString('it-IT')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Massimo</div>
                        <div className="text-lg font-bold text-black dark:text-white">€{priceRange.max.toLocaleString('it-IT')}</div>
                      </div>
                    </div>
                    {priceRange.source === 'ai' && priceRange.detail && (
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-600 pt-2">
                        {priceRange.detail}
                      </p>
                    )}
                  </div>
                )}
                {!priceRangeLoading && priceRange === null && (
                  <></>
                )}
              </div>

              {/* CAMPI MOTORI */}
              {isMotori && (
                <>
                  <div className="mb-4.5">
                    <label className="mb-2.5 block text-black dark:text-white">Marca *</label>
                    <select
                      ref={brandRef}
                      name="brand"
                      defaultValue={item.brand || ''}
                      onChange={async (e) => {
                        const brandCode = e.target.value;
                        console.log('Brand changed:', brandCode, 'userId:', userId);
                        if (brandCode && userId) {
                          const config = await fetchCategoryConfig(userId, selectedCategory, brandCode);
                          console.log('Models received:', config.models?.length);
                          setModels(config.models || []);
                          setTrims([]);
                        }
                      }}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    >
                      <option value="">Seleziona la marca</option>
                      {(selectedCategory === '2' ? AUTO_BRANDS : MOTO_BRANDS).map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </div>

                  {models.length > 0 && (
                    <div className="mb-4.5">
                      <label className="mb-2.5 block text-black dark:text-white">Modello *</label>
                      <select
                        ref={modelRef}
                        name="model"
                        value={selectedModel}
                        onChange={async (e) => {
                          console.log('MODEL ONCHANGE FIRED', e.target.value);
                          const modelCode = e.target.value;
                          setSelectedModel(modelCode);
                          if (modelCode && userId) {
                            const brandCode = brandRef?.current?.value;
                            console.log('Model changed:', modelCode, 'brand:', brandCode);
                            const config = await fetchCategoryConfig(userId, selectedCategory, brandCode, modelCode);
                            console.log('Trims received:', config.trims?.length, config.trims);
                            setTrims(config.trims || []);
                          }
                        }}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      >
                        <option value="">Seleziona il modello</option>
                        {models.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {trims.length > 0 && (
                    <div className="mb-4.5">
                      <label className="mb-2.5 block text-black dark:text-white">Allestimento</label>
                      <select
                        ref={trimRef}
                        name="trim"
                        defaultValue={item.trim || ''}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      >
                        <option value="">Seleziona l'allestimento</option>
                        {trims.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

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
                <input name="pictures" ref={filePickerRef} multiple type="file" accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"
                  className="w-full rounded-md border border-stroke p-3 outline-none transition file:mr-4 file:rounded file:border-[0.5px] file:border-stroke file:bg-[#EEEEEE] file:py-1 file:px-2.5 file:text-sm focus:border-primary file:focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:file:border-strokedark dark:file:bg-white/30 dark:file:text-white"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Formati accettati: JPG, JPEG, PNG, GIF, BMP, WEBP. Massimo 6 immagini.
                </p>
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