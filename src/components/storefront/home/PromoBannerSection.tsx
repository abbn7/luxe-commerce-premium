import { Link } from '@/i18n/navigation';
import SmartImage from '@/components/ui/SmartImage';
import { ArrowIcon } from '@/components/ui/Icons';
import { readPresentation } from '@/lib/media/presentation';
import type { Locale } from '@/i18n/routing';

export default function PromoBannerSection({
  config,
  locale,
  previewDevice
}: {
  config: Record<string, unknown>;
  locale: Locale;
  previewDevice?: 'desktop' | 'mobile';
}) {
  const text = (key: string) =>
    typeof config[key] === 'string' ? (config[key] as string) : '';
  const headline = text(locale === 'ar' ? 'headlineAr' : 'headlineEn');
  const body = text(locale === 'ar' ? 'bodyAr' : 'bodyEn');
  const cta = text(locale === 'ar' ? 'ctaLabelAr' : 'ctaLabelEn');
  const mediaId =
    typeof config.imageMediaId === 'number'
      ? config.imageMediaId
      : typeof config.mobileImageMediaId === 'number'
        ? config.mobileImageMediaId
        : null;
  const shade =
    typeof config.overlay === 'number'
      ? Math.min(80, Math.max(0, config.overlay))
      : 50;
  if (!headline && !body && !mediaId) return null;
  return (
    <section
      className={`campaign-section ${mediaId ? 'campaign-with-image' : ''}`}
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      {mediaId && (
        <div className="absolute inset-0">
          <SmartImage
            mediaId={mediaId}
            mobileMediaId={
              typeof config.mobileImageMediaId === 'number'
                ? config.mobileImageMediaId
                : null
            }
            alt=""
            sizes="100vw"
            presentation={readPresentation(config.imagePresentation)}
            previewDevice={previewDevice}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(18,17,16,${shade / 100})` }}
          />
        </div>
      )}
      <div className="campaign-copy">
        {headline && (
          <h2 className="display-heading section-title">{headline}</h2>
        )}
        {body && (
          <p className="mt-5 leading-relaxed whitespace-pre-line">{body}</p>
        )}
        {cta && text('ctaHref') && (
          <Link
            href={text('ctaHref')}
            className={`${mediaId ? 'btn-light' : 'btn-luxe'} mt-8`}
          >
            {cta}
            <ArrowIcon size={18} />
          </Link>
        )}
      </div>
    </section>
  );
}
