import { getRequestConfig } from 'next-intl/server';

export const locales = ['sv', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'sv';

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale ?? defaultLocale;
  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default
  };
});
