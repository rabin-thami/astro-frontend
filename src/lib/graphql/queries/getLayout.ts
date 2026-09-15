import { fetchGraphQL } from '../client';

export type NavItem = {
  label: string;
  href: string;
  children?: NavItem[];
};

export type LogoConfig = {
  /** Header logo — big logo above the menu with the date. */
  url: string;
  /** Menu logo — small logo shown in the sticky blue menu bar. */
  retina: string;
  /** Text fallback (mobile bar, logo-less clients). */
  text: string;
  alt: string;
};

export type LayoutConfig = {
  logo: LogoConfig;
  nav: NavItem[];
};

/** Defaults until PatrikaOS exposes `patrikaosLayout` (or as graceful fallback). */
export const DEFAULT_LAYOUT: LayoutConfig = {
  logo: { url: '', retina: '', text: 'पत्रिका', alt: 'Patrika' },
  nav: [
    { label: 'होमपेज', href: '/' },
    { label: 'समाचार', href: '/category/news' },
    { label: 'राजनीति', href: '/category/politics' },
    { label: 'अर्थ बाणिज्य', href: '/category/business' },
    { label: 'मनोरञ्जन', href: '/category/entertainment' },
    { label: 'खेलकुद', href: '/category/sports' },
    { label: 'प्रदेश', href: '/category/province' },
    { label: 'विचार', href: '/category/opinion' },
    { label: 'स्वास्थ्य', href: '/category/health' },
  ],
};

const GET_LAYOUT = `
  query GetLayout {
    patrikaosLayout {
      logo { url retina text alt }
      nav { label href children { label href } }
    }
  }
`;

export async function getLayout(): Promise<LayoutConfig> {
  const data = await fetchGraphQL<{ patrikaosLayout: LayoutConfig | null }>(GET_LAYOUT);
  return data?.patrikaosLayout ?? DEFAULT_LAYOUT;
}
