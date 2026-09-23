'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import SmartImage from '@/components/ui/SmartImage';
import Modal from '@/components/ui/Modal';
import { CloseIcon } from '@/components/ui/Icons';

export default function ProductGallery({
  images,
  alt
}: {
  images: number[];
  alt: string;
}) {
  const t = useTranslations('media');
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const count = images.length;
  const index = Math.min(active, Math.max(0, count - 1));
  const step = (direction: number) =>
    setActive((index + direction + count) % count);
  return (
    <div className="product-gallery">
      <button
        type="button"
        className="gallery-main"
        aria-label={t('zoom')}
        disabled={!count}
        onClick={() => setZoom(true)}
      >
        <SmartImage
          mediaId={images[index]}
          alt={alt}
          sizes="(max-width:1024px) 100vw, 50vw"
          priority={index === 0}
          fit="contain"
        />
        {count > 0 && <span className="gallery-zoom-label">{t('zoom')} +</span>}
      </button>
      {count > 1 && (
        <>
          <div className="gallery-status">
            <button
              type="button"
              className="icon-button"
              aria-label={t('previous')}
              onClick={() => step(-1)}
            >
              −
            </button>
            <p aria-live="polite">
              {t('count', { current: index + 1, total: count })}
            </p>
            <button
              type="button"
              className="icon-button"
              aria-label={t('next')}
              onClick={() => step(1)}
            >
              +
            </button>
          </div>
          <div className="gallery-thumbnails" aria-label={alt}>
            {images.map((id, i) => (
              <button
                key={`${id}-${i}`}
                type="button"
                aria-label={t('imageNumber', { number: i + 1 })}
                aria-pressed={i === index}
                onClick={() => setActive(i)}
              >
                <SmartImage mediaId={id} alt="" sizes="80px" fit="contain" />
              </button>
            ))}
          </div>
        </>
      )}
      <Modal
        open={zoom}
        onClose={() => setZoom(false)}
        label={alt}
        className="gallery-dialog"
      >
        <div className="gallery-dialog-toolbar">
          <p>{alt}</p>
          <button
            type="button"
            className="icon-button"
            aria-label={t('close')}
            onClick={() => setZoom(false)}
          >
            <CloseIcon size={22} />
          </button>
        </div>
        <div className="gallery-detail">
          <SmartImage
            mediaId={images[index]}
            alt={alt}
            sizes="100vw"
            fit="contain"
          />
        </div>
        {count > 1 && (
          <div className="gallery-status">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => step(-1)}
            >
              {t('previous')}
            </button>
            <p aria-live="polite">
              {t('count', { current: index + 1, total: count })}
            </p>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => step(1)}
            >
              {t('next')}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
