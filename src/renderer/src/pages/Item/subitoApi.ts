export type SubitoOption = {
  value: string;
  label: string;
};

export const fetchCategoryConfig = async (
  userId: string,
  categoryId: string,
  brandCode?: string,
  modelCode?: string
): Promise<{ brands?: SubitoOption[]; models?: SubitoOption[]; trims?: SubitoOption[] }> => {
  try {
    const data = await window.fetchVehicleConfig(userId, categoryId, brandCode, modelCode);
    if (!data || !data.value_lists) return {};
    console.log('value_lists keys:', Object.keys(data.value_lists));
    return {
      brands: data.value_lists?.carbrand || data.value_lists?.bikebrand,
      models: data.value_lists?.carmodel || data.value_lists?.bikemodel,
      trims: data.value_lists?.carversion || data.value_lists?.bikeversion || data.value_lists?.cartrim
    };
  } catch (err) {
    console.error('API error:', err);
    return {};
  }
};