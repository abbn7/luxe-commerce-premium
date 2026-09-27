import SmartImage from '@/components/ui/SmartImage';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { allHomeSectionsForAdmin } from '@/lib/db/repos/content';
import { PlusIcon } from '@/components/ui/Icons';
import type { ImagePresentation } from '@/lib/media/presentation';

export const dynamic = 'force-dynamic';

const TYPE_LABEL_KEYS: Record<string, string> = {
  hero: 'typeHero',
  featured_products: 'typeFeatured',
  collection_highlight: 'typeCollectionHighlight',
  new_arrivals: 'typeNewArrivals',
  lookbook_preview: 'typeLookbookPreview',
  brand_story: 'typeBrandStory',
  promo_banner: 'typePromoBanner'
};
const TYPE_DESCRIPTION_KEYS: Record<string, string> = {
  hero: 'purposeHero',
  featured_products: 'purposeFeatured',
  collection_highlight: 'purposeCollectionHighlight',
  new_arrivals: 'purposeNewArrivals',
  lookbook_preview: 'purposeLookbookPreview',
  brand_story: 'purposeBrandStory',
  promo_banner: 'purposePromoBanner'
};

export default async function AdminHomeSectionsPage() {
  const locale = await getLocale();
  const t = await getTranslations('admin.homeSections');
  const tCommon = await getTranslations('admin.common');

  const sections = allHomeSectionsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display-heading text-3xl">{t('title')}</h1>
        <Link href="/admin/home-sections/new" className="admin-btn">
          <PlusIcon size={16} />
          {t('new')}
        </Link>
      </div>
      <div className="admin-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-sm font-medium">{t('listIntroTitle')}</p>
          <p className="text-xs text-stone-deep leading-relaxed mt-1">
            {t('listIntro')}
          </p>
        </div>
        <Link href="/" target="_blank" className="admin-btn-secondary text-xs">
          {t('viewHomepage')}
        </Link>
      </div>

      {sections.length === 0 ? (
        <div className="admin-card p-10 text-center">
          <p className="display-heading text-2xl">{t('emptyTitle')}</p>
          <p className="text-sm text-stone-deep mt-2">
            {t('emptyDescription')}
          </p>
          <Link
            href="/admin/home-sections/new"
            className="admin-btn mt-4 inline-flex"
          >
            <PlusIcon size={16} />
            {t('new')}
          </Link>
        </div>
      ) : (
        <ol className="space-y-2" aria-label={t('title')}>
          {sections.map((s, i) => {
            let config: Record<string, unknown> = {};
            try {
              config = JSON.parse(s.config);
            } catch {
              /* Keep a damaged row editable. */
            }
            const title =
              config[locale === 'ar' ? 'headlineAr' : 'headlineEn'] ||
              config[locale === 'ar' ? 'titleAr' : 'titleEn'];
            return (
              <li key={s.id}>
                <Link
                  href={`/admin/home-sections/${s.id}`}
                  className="admin-card p-4 flex items-center justify-between gap-4 hover:border-ink transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className="text-xs text-stone tabular-nums shrink-0"
                      dir="ltr"
                    >
                      {i + 1}.
                    </span>
                    <div className="relative w-20 aspect-[4/3] shrink-0 bg-ivory hidden sm:block">
                      <SmartImage
                        mediaId={
                          typeof config.imageMediaId === 'number'
                            ? config.imageMediaId
                            : null
                        }
                        presentation={
                          config.imagePresentation as
                            Partial<ImagePresentation> | string | null
                        }
                        alt=""
                        sizes="80px"
                      />
                    </div>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">
                        {t(TYPE_LABEL_KEYS[s.type] ?? s.type)}
                      </span>
                      <span className="block text-xs text-stone-deep truncate mt-1">
                        {typeof title === 'string' && title
                          ? title
                          : t(TYPE_DESCRIPTION_KEYS[s.type] ?? 'listIntro')}
                      </span>
                    </span>
                  </div>
                  <span className="flex flex-col items-end gap-1.5 shrink-0 text-xs">
                    <span
                      className={
                        s.is_visible === 1 ? 'text-[#2f6b4f]' : 'text-stone'
                      }
                    >
                      {s.is_visible === 1 ? t('liveStatus') : tCommon('hidden')}
                    </span>
                    <span className="text-stone-deep underline underline-offset-4">
                      {tCommon('edit')}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
