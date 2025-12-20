import { getRequestConfig } from 'next-intl/server';

export const locales = ['sv', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'sv';

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
