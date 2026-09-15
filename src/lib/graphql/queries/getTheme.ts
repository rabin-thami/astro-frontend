import { fetchGraphQL } from '../client';

export type AdSlotConfig = {
  enabled: boolean;
  imageUrl: string;
  /** Admin-written alt text; may be empty. */
  alt: string;
  linkUrl: string;
  /** Epoch seconds; 0 = never expires. */
  expiresAt: number;
};

/** Slot is renderable: on, has an image, and hasn't passed its expiry. */
export function isSlotActive(slot: AdSlotConfig | undefined): boolean {
  if (!slot?.enabled || !slot.imageUrl.trim()) return false;
  return slot.expiresAt === 0 || slot.expiresAt * 1000 > Date.now();
}

export type SigninConfig = {
  enabled: boolean;
  signinUrl: string;
  joinUrl: string;
};

/** Share rail config (PatrikaOS Social module; order = render order). */
export type SocialConfig = {
  enabled: boolean;
  networks: string[];
};

export type FooterLink = { title: string; value: string };
export type FooterColumn = { title: string; gridCols: number; gridRows: number; links: FooterLink[] };
export type FooterConfig = {
  logoUrl: string;
  description: string;
  columns: FooterColumn[];
  publisherName: string;
  publisherAddress: string;
  regNo: string;
  email: string;
  phone: string;
  teamName: string;
  teamRole: string;
};

export type ThemeColors = {
  primary: string | null;
  background: string | null;
  text: string | null;
  headerBg: string | null;
  headerText: string | null;
  toolbar: string | null;
};

export type ThemeHead = {
  ads: {
    header: AdSlotConfig;
    /** Repeatable article-rail banners (WP ad_sidebar_ads rows). */
    sidebar: AdSlotConfig[];
    featuredInline: AdSlotConfig;
    featuredEnd: AdSlotConfig;
    afterNews: AdSlotConfig;
    afterProvince: AdSlotConfig;
    afterTech: AdSlotConfig;
  };
  faviconUrl: string;
  logoUrl: string;
  iosIconUrl: string;
  iosTitle: string;
  signin: SigninConfig;
  social: SocialConfig;
  colors: ThemeColors;
  footer: FooterConfig;
};

/** Slot node exactly as GraphQL returns it — every field nullable. */
export type RawAdSlot = {
  enabled: boolean | null;
  imageUrl: string | null;
  alt: string | null;
  linkUrl: string | null;
  expiresAt: number | null;
};

type GetThemeResponse = {
  patrikaosSocial: { enabled: boolean | null; networks: string[] | null } | null;
  patrikaosTheme: {
    logoUrl: string | null;
    colors: {
      primary: string | null;
      secondary: string | null;
      background: string | null;
      text: string | null;
      headerBg: string | null;
      headerText: string | null;
      toolbar: string | null;
    } | null;
    footer: {
      logoUrl: string | null;
      description: string | null;
      columns: Array<{ title: string | null; gridCols: number | null; gridRows: number | null; links: Array<{ title: string | null; value: string | null } | null> | null } | null> | null;
      publisherName: string | null;
      publisherAddress: string | null;
      regNo: string | null;
      email: string | null;
      phone: string | null;
      teamName: string | null;
      teamRole: string | null;
    } | null;
    ads: {
      header: RawAdSlot | null;
      sidebar: RawAdSlot[] | null;
      featuredInline: RawAdSlot | null;
      featuredEnd: RawAdSlot | null;
      afterNews: RawAdSlot | null;
      afterProvince: RawAdSlot | null;
      afterTech: RawAdSlot | null;
    } | null;
    header: {
      faviconUrl: string | null;
      signin: { enabled: boolean | null; signinUrl: string | null; joinUrl: string | null } | null;
      ios: { iconUrl: string | null; title: string | null } | null;
    } | null;
  } | null;
};

const GET_THEME_HEAD = `
  query GetThemeHead {
    patrikaosSocial { enabled networks }
    patrikaosTheme {
      logoUrl
      colors {
        primary
        secondary
        background
        text
        headerBg
        headerText
        toolbar
      }
      footer {
        logoUrl
        description
        columns { title gridCols gridRows links { title value } }
        publisherName
        publisherAddress
        regNo
        email
        phone
        teamName
        teamRole
      }
      ads {
        header { enabled imageUrl alt linkUrl expiresAt }
        sidebar { enabled imageUrl alt linkUrl expiresAt }
        featuredInline { enabled imageUrl alt linkUrl expiresAt }
        featuredEnd { enabled imageUrl alt linkUrl expiresAt }
        afterNews { enabled imageUrl alt linkUrl expiresAt }
        afterProvince { enabled imageUrl alt linkUrl expiresAt }
        afterTech { enabled imageUrl alt linkUrl expiresAt }
      }
      header {
        faviconUrl
        signin { enabled signinUrl joinUrl }
        ios { iconUrl title }
      }
    }
  }
`;

const emptyFooter: FooterConfig = {
  logoUrl: '',
  description: '',
  columns: [],
  publisherName: '',
  publisherAddress: '',
  regNo: '',
  email: '',
  phone: '',
  teamName: '',
  teamRole: '',
};

function clampGrid(n: number | null | undefined, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * WP-side defaults for the color tokens. A color equal to its default means
 * "never customized in the panel" — returned as null so the frontend keeps
 * its own designed default instead of being clobbered by placeholder values.
 */
const WP_COLOR_DEFAULTS: Record<keyof ThemeColors, string> = {
  primary: '#0b5cad',
  background: '#ffffff',
  text: '#16181d',
  headerBg: '#0b5cad',
  headerText: '#ffffff',
  toolbar: '#0b5cad',
};

function customizedColor(value: string | null | undefined, key: keyof ThemeColors): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(v)) return null;
  return v === WP_COLOR_DEFAULTS[key] ? null : v;
}

const emptyAdSlot: AdSlotConfig = {
  enabled: false,
  imageUrl: '',
  alt: '',
  linkUrl: '',
  expiresAt: 0,
};

export function normalizeAdSlot(slot: RawAdSlot | null | undefined): AdSlotConfig {
  return {
    enabled: slot?.enabled ?? false,
    imageUrl: slot?.imageUrl ?? '',
    alt: slot?.alt ?? '',
    linkUrl: slot?.linkUrl ?? '',
    expiresAt: slot?.expiresAt ?? 0,
  };
}

/** Normalized slot, or null unless it is renderable (on, imaged, unexpired). */
export function activeSlot(
  slot: RawAdSlot | null | undefined,
): AdSlotConfig | null {
  const normalized = normalizeAdSlot(slot);
  return isSlotActive(normalized) ? normalized : null;
}

/** Renderable slots from a repeatable list, in WP order. */
export function activeSlots(
  raws: Array<RawAdSlot | null> | null | undefined,
): AdSlotConfig[] {
  return (raws ?? [])
    .filter((s): s is RawAdSlot => s !== null)
    .map((s) => normalizeAdSlot(s))
    .filter((s) => isSlotActive(s));
}

export async function getThemeHead(): Promise<ThemeHead> {
  const fallback: ThemeHead = {
    faviconUrl: '',
    logoUrl: '',
    iosIconUrl: '',
    iosTitle: '',
    signin: { enabled: false, signinUrl: '', joinUrl: '' },
    social: { enabled: false, networks: [] },
    colors: { primary: null, background: null, text: null, headerBg: null, headerText: null, toolbar: null },
    footer: emptyFooter,
    ads: {
      header: emptyAdSlot,
      sidebar: [],
      featuredInline: emptyAdSlot,
      featuredEnd: emptyAdSlot,
      afterNews: emptyAdSlot,
      afterProvince: emptyAdSlot,
      afterTech: emptyAdSlot,
    },
  };
  const data = await fetchGraphQL<GetThemeResponse>(GET_THEME_HEAD);
  const theme = data?.patrikaosTheme;
  if (!theme) return fallback;
  const ff = theme.footer;
  const c = theme.colors;
  return {
    faviconUrl: theme.header?.faviconUrl ?? '',
    logoUrl: theme.logoUrl ?? '',
    iosIconUrl: theme.header?.ios?.iconUrl ?? '',
    iosTitle: theme.header?.ios?.title ?? '',
    signin: {
      enabled: theme.header?.signin?.enabled ?? false,
      signinUrl: theme.header?.signin?.signinUrl ?? '',
      joinUrl: theme.header?.signin?.joinUrl ?? '',
    },
    social: {
      enabled: data?.patrikaosSocial?.enabled ?? false,
      networks: data?.patrikaosSocial?.networks ?? [],
    },
    ads: {
      header: normalizeAdSlot(theme.ads?.header),
      sidebar: (theme.ads?.sidebar ?? [])
        .filter((s) => s !== null)
        .map((s) => normalizeAdSlot(s)),
      featuredInline: normalizeAdSlot(theme.ads?.featuredInline),
      featuredEnd: normalizeAdSlot(theme.ads?.featuredEnd),
      afterNews: normalizeAdSlot(theme.ads?.afterNews),
      afterProvince: normalizeAdSlot(theme.ads?.afterProvince),
      afterTech: normalizeAdSlot(theme.ads?.afterTech),
    },
    colors: {
      primary: customizedColor(c?.primary, 'primary'),
      background: customizedColor(c?.background, 'background'),
      text: customizedColor(c?.text, 'text'),
      headerBg: customizedColor(c?.headerBg, 'headerBg'),
      headerText: customizedColor(c?.headerText, 'headerText'),
      toolbar: customizedColor(c?.toolbar, 'toolbar'),
    },
    footer: {
      logoUrl: ff?.logoUrl ?? '',
      description: ff?.description ?? '',
      columns: (ff?.columns ?? []).filter((c) => c !== null).map((c) => ({
        title: c!.title ?? '',
        gridCols: clampGrid(c!.gridCols, 1, 4, 1),
        gridRows: clampGrid(c!.gridRows, 0, 12, 0),
        links: (c!.links ?? []).filter((l) => l !== null).map((l) => ({
          title: l!.title ?? '',
          value: l!.value ?? '',
        })),
      })),
      publisherName: ff?.publisherName ?? '',
      publisherAddress: ff?.publisherAddress ?? '',
      regNo: ff?.regNo ?? '',
      email: ff?.email ?? '',
      phone: ff?.phone ?? '',
      teamName: ff?.teamName ?? '',
      teamRole: ff?.teamRole ?? '',
    },
  };
}
