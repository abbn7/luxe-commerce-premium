import { Link } from '@/i18n/navigation';
import SmartImage from '@/components/ui/SmartImage';
import { ArrowIcon } from '@/components/ui/Icons';
import { readPresentation } from '@/lib/media/presentation';
import type { Locale } from '@/i18n/routing';

/** Shared by the storefront and the unsaved section preview. Old records default to overlay. */
export default function HeroSection({
  config,
  locale,
  previewDevice,
  priority = true,
  headingLevel = 1
}: {
  config: Record<string, unknown>;
  locale: Locale;
  previewDevice?: 'desktop' | 'mobile';
  priority?: boolean;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const text = (key: string) =>
    typeof config[key] === 'string' ? (config[key] as string) : '';
  const headline = text(locale === 'ar' ? 'headlineAr' : 'headlineEn');
  const subline = text(locale === 'ar' ? 'sublineAr' : 'sublineEn');
  const cta = text(locale === 'ar' ? 'ctaLabelAr' : 'ctaLabelEn');
  const split = config.layout === 'split';
  const mediaId =
    typeof config.imageMediaId === 'number'
      ? config.imageMediaId
      : typeof config.mobileImageMediaId === 'number'
        ? config.mobileImageMediaId
        : null;
  const mobileId =
    typeof config.mobileImageMediaId === 'number'
      ? config.mobileImageMediaId
      : null;
  const alignment = ['start', 'end'].includes(String(config.alignment))
    ? String(config.alignment)
    : 'center';
  const shade =
    typeof config.overlay === 'number'
      ? Math.min(80, Math.max(0, config.overlay))
      : 40;
  return (
    <section
      className={`hero-shell ${split ? 'hero-split' : 'hero-overlay'} ${!mediaId ? 'hero-without-image' : ''}`}
      aria-label={headline || undefined}
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="hero-stage" data-align={alignment}>
        <div className="hero-media">
          {mediaId && (
            <SmartImage
              mediaId={mediaId}
              mobileMediaId={mobileId}
              alt=""
              sizes={split ? '(max-width: 767px) 100vw, 55vw' : '100vw'}
              priority={priority}
              presentation={readPresentation(config.imagePresentation)}
              previewDevice={previewDevice}
            />
          )}
          {!split && mediaId && (
            <div
              className="hero-shade"
              style={{ backgroundColor: `rgba(18,17,16,${shade / 100})` }}
            />
          )}
        </div>
        <div className="hero-copy">
          {subline && <p className="eyebrow hero-eyebrow">{subline}</p>}
          {headline && (
            <Heading className="display-heading hero-title">{headline}</Heading>
          )}
          {cta && text('ctaHref') && (
            <Link
              href={text('ctaHref')}
              className={`hero-cta ${split || !mediaId ? 'btn-luxe' : 'btn-light'}`}
            >
              {cta}
              <ArrowIcon size={18} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
