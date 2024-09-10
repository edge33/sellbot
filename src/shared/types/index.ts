type AppSettings = {
  itemsPath?: string;
  cookiesStored: boolean;
  mobilePhone: string;
  chromiumPath: string;
};

type Item = {
  filePath: string;
  title: string;
  description: string;
  price: number;
  dimension: number;
  condition: number;
  type: number;
  photos: string[];
};

export type { AppSettings, Item };
