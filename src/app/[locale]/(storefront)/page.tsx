import { getLocale } from 'next-intl/server';
import { visibleHomeSections } from '@/lib/db/repos/content';
import { queryProducts, productsByIds } from '@/lib/db/repos/products';
import { visibleLookbook } from '@/lib/db/repos/content';
import { collectionById, visibleCollections } from '@/lib/db/repos/collections';
import { getSettings } from '@/lib/db/repos/settings';
import HomeSectionRenderer from '@/components/storefront/home/HomeSectionRenderer';
import { fallbackHomeSections } from '@/lib/storefront/home-fallback';
import type { Locale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const locale = (await getLocale()) as Locale;
  const settings = getSettings();
  const sections = visibleHomeSections();

  const currency = {
    en: settings.locale.currencySymbolEn,
    ar: settings.locale.currencySymbolAr
  };

  const displaySections =
    sections.length === 0
      ? (() => {
          const products = queryProducts({ limit: 4, sort: 'newest' }).products;
          const firstCollection = visibleCollections()[0];
          const collectionId =
            firstCollection &&
            queryProducts({
              collectionSlug: firstCollection.slug,
              limit: 1
            }).total > 0
              ? firstCollection.id
              : null;
          return fallbackHomeSections(
            {
              headlineEn: settings.branding.storeNameEn,
              headlineAr: settings.branding.storeNameAr,
              sublineEn: settings.branding.taglineEn,
              sublineAr: settings.branding.taglineAr,
              ctaLabelEn: 'Explore collections',
              ctaLabelAr: 'اكتشف المجموعات',
              ctaHref: '/collections'
            },
            collectionId,
            products.map((product) => product.id)
          );
        })()
      : sections.map((section) => ({
          id: section.id,
          type: section.type,
          config: JSON.parse(section.config)
        }));

  return (
    <HomeSectionRenderer
      sections={displaySections}
      locale={locale}
      currency={currency}
      resolveProducts={(ids) =>
        productsByIds(ids).filter((p) => p.status === 'active')
      }
      newArrivals={(limit) =>
        queryProducts({ onlyNew: true, limit, sort: 'newest' }).products
      }
      lookbookItems={(limit) => visibleLookbook().slice(0, limit)}
      resolveCollection={(id) => collectionById(id)}
      collectionProducts={(slug, limit) =>
        queryProducts({ collectionSlug: slug, limit }).products.filter(
          (p) => p.status === 'active'
        )
      }
    />
  );
}
