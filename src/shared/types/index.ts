type AppSettings = {
  itemsPath?: string;
  cookiesStored: boolean;
  mobilePhone: string;
  chromiumPath: string;
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
};

export type { AppSettings, Item };
