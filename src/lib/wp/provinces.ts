export type ProvinceConfig = {
  id: string;
  slug: string;
  numeral: string;
};

/** Province slugs must match WP category slugs (see reference provinces.ts). */
export const PROVINCES: readonly ProvinceConfig[] = [
  { id: 'all', slug: '__all__', numeral: 'सबै' },
  { id: 'koshi-1', slug: 'province-1', numeral: '१' },
  { id: 'madhesh-2', slug: 'province-2', numeral: '२' },
  { id: 'bagmati-3', slug: 'province-3', numeral: '३' },
  { id: 'gandaki-4', slug: 'province-4', numeral: '४' },
  { id: 'lumbini-5', slug: 'province-5', numeral: '५' },
  { id: 'karnali-6', slug: 'province-6', numeral: '६' },
  { id: 'sudurpaschim-7', slug: 'province-7', numeral: '७' },
];

export const getProvinceBySlug = (slug: string): ProvinceConfig | undefined =>
  PROVINCES.find((p) => p.slug === slug);

/** Validated select value for ?province=, or "__all__" when absent/unknown. */
export const resolveProvinceSlug = (selected: string | undefined): string =>
  (selected && getProvinceBySlug(selected)?.slug) || '__all__';
