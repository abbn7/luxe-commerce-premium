import { Link } from '@/i18n/navigation';
import SmartImage from '@/components/ui/SmartImage';
import { ArrowIcon } from '@/components/ui/Icons';
import { readPresentation } from '@/lib/media/presentation';
import type { Locale } from '@/i18n/routing';

export default function BrandStorySection({
  config,
  locale,
  previewDevice
}: {
  config: Record<string, unknown>;
  locale: Locale;
  previewDevice?: 'desktop' | 'mobile';
}) {
  const title = String(config[locale === 'ar' ? 'titleAr' : 'titleEn'] ?? '');
  const body = String(config[locale === 'ar' ? 'bodyAr' : 'bodyEn'] ?? '');
  const mediaId =
    typeof config.imageMediaId === 'number' ? config.imageMediaId : null;
  if (!title && !body && !mediaId) return null;
  return (
    <section
      className="story-shell section-space"
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div
        className={`store-container story-layout ${!mediaId ? 'story-text-only' : ''}`}
      >
        {mediaId && (
          <div className="story-image">
            <SmartImage
              mediaId={mediaId}
              alt={title}
              sizes="(max-width: 767px) 100vw, 50vw"
              presentation={readPresentation(config.imagePresentation)}
              previewDevice={previewDevice}
            />
          </div>
        )}
        <div className="story-copy">
          <p className="eyebrow mb-5">
            {locale === 'ar' ? 'حكايتنا' : 'Our story'}
          </p>
          {title && <h2 className="display-heading section-title">{title}</h2>}
          {body && (
            <p className="mt-7 text-stone-deep leading-loose whitespace-pre-line">
              {body}
            </p>
          )}
          <Link href="/about" className="editorial-link mt-8">
            {locale === 'ar' ? 'اكتشف الحكاية' : 'Discover our story'}
            <ArrowIcon size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
