import { getTranslations } from 'next-intl/server';

/**
 * Storefront loading state — a single calm line, no spinners or noise.
 * Streams in while dynamic pages fetch data from SQLite.
 */
export default async function StorefrontLoading() {
  const t = await getTranslations('common');

  return (
    <div className="store-container py-16" role="status" aria-busy="true">
      <div className="loading-editorial" aria-hidden="true">
        <div />
        <div />
        <div />
        <div />
      </div>
      <p className="eyebrow mt-8 text-center">{t('loading')}</p>
    </div>
  );
}
