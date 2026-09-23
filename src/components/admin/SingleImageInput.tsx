'use client';
import MediaField from './MediaField';
import ImagePresentationControl from './ImagePresentationControl';
import type { ImagePreset, ImagePresentation } from '@/lib/media/presentation';

export default function SingleImageInput({
  mediaId,
  onChange,
  label,
  preset = 'editorial',
  presentation,
  onPresentationChange
}: {
  mediaId: number | null;
  onChange: (id: number | null) => void;
  label: string;
  aspect?: string;
  preset?: ImagePreset;
  presentation?: unknown;
  onPresentationChange?: (value: ImagePresentation) => void;
}) {
  return (
    <div className="space-y-4">
      <MediaField
        mediaIds={mediaId ? [mediaId] : []}
        onChange={(ids) => onChange(ids[0] ?? null)}
        label={label}
        preset={preset}
      />
      {mediaId && onPresentationChange && (
        <ImagePresentationControl
          mediaId={mediaId}
          value={presentation}
          onChange={onPresentationChange}
          preset={preset}
        />
      )}
    </div>
  );
}
