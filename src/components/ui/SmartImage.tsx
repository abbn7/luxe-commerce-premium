'use client';

import { useState, type CSSProperties } from 'react';
import Image, { getImageProps } from 'next/image';
import {
  readPresentation,
  type ImagePresentation
} from '@/lib/media/presentation';

interface Props {
  mediaId: number | null | undefined;
  mobileMediaId?: number | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  fit?: 'cover' | 'contain';
  presentation?: Partial<ImagePresentation> | string | null;
  previewDevice?: 'desktop' | 'mobile';
}

/** Never stretches an asset. All responsive positions are placement-specific. */
export default function SmartImage(props: Props) {
  return (
    <ImageContent key={`${props.mediaId}:${props.mobileMediaId}`} {...props} />
  );
}

function ImageContent({
  mediaId,
  mobileMediaId,
  alt,
  className = '',
  imgClassName = '',
  fill = true,
  width,
  height,
  sizes = '(max-width: 768px) 100vw, 33vw',
  priority = false,
  fit,
  presentation,
  previewDevice
}: Props) {
  const [failed, setFailed] = useState(false);
  const [mobileFailed, setMobileFailed] = useState(false);
  const p = readPresentation(presentation);
  const imageFit =
    fit ??
    (presentation
      ? p.fit
      : imgClassName.includes('object-cover')
        ? 'cover'
        : 'contain');
  const mobile = previewDevice === 'mobile';
  const sourceId =
    mobile && mobileMediaId && !mobileFailed ? mobileMediaId : mediaId;
  const style = {
    objectFit: imageFit,
    '--image-position': `${mobile ? p.mobileX : p.x}% ${mobile ? p.mobileY : p.y}%`,
    '--image-mobile-position': `${p.mobileX}% ${p.mobileY}%`,
    ...(previewDevice
      ? {
          objectPosition: `${mobile ? p.mobileX : p.x}% ${mobile ? p.mobileY : p.y}%`
        }
      : {})
  } as CSSProperties;

  if (!sourceId || failed)
    return (
      <span
        className={`image-placeholder ${fill ? 'absolute inset-0' : 'inline-flex'} ${className}`}
        style={!fill ? { width, height } : undefined}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <rect x="8" y="10" width="24" height="20" stroke="currentColor" />
          <circle cx="16" cy="17" r="2" stroke="currentColor" />
          <path d="M8 26l7-6 5 4 6-5 6 5" stroke="currentColor" />
        </svg>
      </span>
    );

  const alternate =
    mobileMediaId && !mobileFailed && !previewDevice
      ? getImageProps({
          src: `/api/media/${mobileMediaId}`,
          alt,
          fill: true,
          sizes: '100vw'
        }).props
      : null;
  return (
    <picture>
      {alternate && (
        <source
          media="(max-width: 767px)"
          srcSet={alternate.srcSet}
          sizes="100vw"
        />
      )}
      <Image
        src={`/api/media/${sourceId}`}
        alt={alt}
        className={`smart-image ${className} ${imgClassName}`}
        style={style}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        priority={priority && !alternate}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        onError={() => {
          if (mobileMediaId && !mobileFailed) setMobileFailed(true);
          else setFailed(true);
        }}
      />
    </picture>
  );
}
