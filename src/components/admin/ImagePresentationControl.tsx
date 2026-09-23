'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import SmartImage from '@/components/ui/SmartImage';
import {
  IMAGE_PRESETS,
  readPresentation,
  DEFAULT_PRESENTATION,
  type ImagePreset,
  type ImagePresentation
} from '@/lib/media/presentation';

export default function ImagePresentationControl({
  mediaId,
  mobileMediaId,
  value,
  onChange,
  preset = 'editorial'
}: {
  mediaId: number | null;
  mobileMediaId?: number | null;
  value: unknown;
  onChange: (value: ImagePresentation) => void;
  preset?: ImagePreset;
}) {
  const t = useTranslations('media');
  const id = useId();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const p = readPresentation(value);
  const mobile = device === 'mobile';
  const xKey = mobile ? 'mobileX' : 'x';
  const yKey = mobile ? 'mobileY' : 'y';
  const ratio =
    mobile && (preset === 'hero' || preset === 'banner')
      ? '4 / 5'
      : IMAGE_PRESETS[preset].ratio;
  return (
    <div className="image-controls">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{t('composition')}</h3>
        <div className="segmented-control" aria-label={t('preview')}>
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
      </div>
      <div className="image-controls-grid">
        <div
          className="image-composition-preview"
          style={{ aspectRatio: ratio, maxWidth: mobile ? 230 : undefined }}
        >
          <SmartImage
            mediaId={mediaId}
            mobileMediaId={mobileMediaId}
            alt=""
            presentation={p}
            previewDevice={device}
            sizes="400px"
          />
        </div>
        <div className="space-y-4">
          <label className="block text-sm" htmlFor={`${id}-fit`}>
            {t('fit')}
          </label>
          <select
            className="admin-input"
            id={`${id}-fit`}
            value={p.fit}
            onChange={(e) =>
              onChange({
                ...p,
                fit: e.target.value as ImagePresentation['fit']
              })
            }
          >
            <option value="cover">{t('cover')}</option>
            <option value="contain">{t('contain')}</option>
          </select>
          <p className="text-xs text-stone-deep leading-relaxed">
            {t(p.fit === 'cover' ? 'cropHint' : 'containHint')}
          </p>
          {(['x', 'y'] as const).map((axis) => {
            const key = axis === 'x' ? xKey : yKey;
            return (
              <div key={axis}>
                <label
                  htmlFor={`${id}-${axis}`}
                  className="flex justify-between gap-2 text-xs mb-2"
                >
                  <span>{t(axis === 'x' ? 'horizontal' : 'vertical')}</span>
                  <output dir="ltr">{p[key]}%</output>
                </label>
                <input
                  id={`${id}-${axis}`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  dir="ltr"
                  className="w-full accent-[var(--accent)]"
                  value={p[key]}
                  onChange={(e) =>
                    onChange({ ...p, [key]: Number(e.target.value) })
                  }
                />
              </div>
            );
          })}
          <button
            type="button"
            className="text-xs underline underline-offset-4"
            onClick={() => onChange({ ...DEFAULT_PRESENTATION })}
          >
            {t('reset')}
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-deep">{t('positionHint')}</p>
    </div>
  );
}
