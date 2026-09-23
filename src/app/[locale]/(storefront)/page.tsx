import HeroSection from '@/components/storefront/home/HeroSection';
import { getLocale } from 'next-intl/server';
import { visibleHomeSections } from '@/lib/db/repos/content';
import { queryProducts, productsByIds } from '@/lib/db/repos/products';
import { visibleLookbook } from '@/lib/db/repos/content';
import { collectionById } from '@/lib/db/repos/collections';
import { getSettings } from '@/lib/db/repos/settings';
import HomeSectionRenderer from '@/components/storefront/home/HomeSectionRenderer';
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

  if (sections.length === 0)
    return (
      <HeroSection
        locale={locale}
        config={{
          headlineEn: settings.branding.storeNameEn,
          headlineAr: settings.branding.storeNameAr,
          sublineEn: settings.branding.taglineEn,
          sublineAr: settings.branding.taglineAr,
          ctaLabelEn: 'Explore collections',
          ctaLabelAr: 'اكتشف المجموعات',
          ctaHref: '/collections'
        }}
      />
    );

  return (
    <HomeSectionRenderer
      sections={sections.map((s) => ({
        id: s.id,
        type: s.type,
        config: JSON.parse(s.config)
      }))}
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
