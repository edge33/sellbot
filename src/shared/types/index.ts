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
  dimension: string;
  condition: string;
  type: string;
  photos?: string[];
};

export type { AppSettings, Item };
