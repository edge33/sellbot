type DescriptionSettings = {
  sections: {
    intro: boolean;
    specs: boolean;
    usage: boolean;
    condition: boolean;
    shipping: boolean;
    cta: boolean;
  };
  tone: 'neutro' | 'formale' | 'colloquiale' | 'vendita' | 'privato';
  length: 'breve' | 'media' | 'dettagliata';
  extraInstructions?: string;
};

type AppSettings = {
  itemsPath?: string;
  cookiesStored: boolean;
  mobilePhone: string;
  chromiumPath: string;
  location?: string;
  geminiApiKey?: string;
  descriptionSettings?: DescriptionSettings;
  statsRefreshHours?: number; // 0 = disabilitato
};

type Item = {
  id?: string;
  category: string;
  filePath: string;
  title: string;
  description: string;
  price: number;
  dimension?: string;
  condition?: string;
  type?: string;
  photos?: string[];
  // Auto / Moto fields
  brand?: string;
  model?: string;
  trim?: string;
  mileage?: string;
  year?: string;
  month?: string;
  fuel?: string;
  bodyType?: string;
  gearbox?: string;
  emissions?: string;
  seats?: string;
  doors?: string;
  color?: string;
  plate?: string;
  ean?: string;
  // Abbigliamento (cat 16)
  clothingGender?: string; // uomo/donna/bambino
  // Tutto per i bambini (cat 17)
  childrenAge?: string; // fascia d'età

  isOnline?: boolean;
  deletedAt?: string; // presente solo negli item nel cestino
  archived?: boolean; // annuncio venduto/archiviato, nascosto dalla dashboard
  archivedAt?: string;
  stats?: {
    position?: string;   // es. "1°", "2°"
    views?: number;
    messages?: number;
    lastChecked?: string; // ISO date
  };
};

type Schedule = {
  id: string;
  name?: string;
  itemIds: string[];
  type: 'once' | 'recurring' | 'watch';
  scheduledAt?: string;  // solo per 'once'
  startAt?: string;      // prima esecuzione per 'recurring'
  intervalHours?: number;
  lastRun?: string;
  nextRun?: string;      // non presente per 'watch'
  active: boolean;
  paused?: boolean;
  createdAt: string;
  republishOnPageOver?: number;
  history?: { runAt: string; outcome: 'success' | 'error'; message?: string }[];
};

// Set di categorie usate sia in main che in renderer per evitare magic strings
export const MOTORI_CATEGORIES = ['2', '3', '4', '22', '34'] as const;
export const CATEGORIES_REQUIRE_TYPE = ['10', '11', '12', '16', '17', '20', '21', '38', '41'] as const;
export const CATEGORY_REQUIRES_CLOTHING_GENDER = '16';
export const CATEGORY_REQUIRES_CHILDREN_AGE = '17';

export type { AppSettings, DescriptionSettings, Item, Schedule };
