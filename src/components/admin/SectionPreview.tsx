'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import HeroSection from '@/components/storefront/home/HeroSection';
import PromoBannerSection from '@/components/storefront/home/PromoBannerSection';
import BrandStorySection from '@/components/storefront/home/BrandStorySection';
import type { Locale } from '@/i18n/routing';

export default function SectionPreview({
  type,
  config
}: {
  type: string;
  config: Record<string, unknown>;
}) {
  const t = useTranslations('media');
  const currentLocale = useLocale() as Locale;
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const frame = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(600);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setAvailable(entries[0].contentRect.width)
    );
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const width = device === 'desktop' ? 1280 : 390;
  return (
    <section className="admin-card section-preview">
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <h2 className="text-sm font-medium">{t('sectionPreview')}</h2>
        <div className="flex flex-wrap gap-2">
          <div className="segmented-control">
            {(['desktop', 'mobile'] as const).map((d) => (
              <button
                type="button"
                key={d}
                aria-pressed={device === d}
                onClick={() => setDevice(d)}
              >
                {t(d)}
              </button>
            ))}
          </div>
          <div className="segmented-control">
            {(['en', 'ar'] as const).map((l) => (
              <button
                type="button"
                key={l}
                aria-pressed={locale === l}
                onClick={() => setLocale(l)}
              >
                {l === 'ar' ? 'العربية' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div ref={frame} className="section-preview-frame">
        <div
          className="section-preview-canvas"
          style={{ width, zoom: Math.min(1, available / width) }}
          inert
        >
          {type === 'hero' ? (
            <HeroSection
              config={config}
              locale={locale}
              previewDevice={device}
              priority={false}
            />
          ) : type === 'promo_banner' ? (
            <PromoBannerSection
              config={config}
              locale={locale}
              previewDevice={device}
            />
          ) : (
            <BrandStorySection
              config={config}
              locale={locale}
              previewDevice={device}
            />
          )}
        </div>
      </div>
      <p className="p-4 text-xs text-stone-deep border-t border-line">
        {t('previewHint')}
      </p>
    </section>
  );
}
