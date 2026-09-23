'use client';
import MediaField from './MediaField';
import type { ImagePreset } from '@/lib/media/presentation';
export default function ImageUploader({
  mediaIds,
  onChange,
  max = 10,
  hint,
  preset = 'product'
}: {
  mediaIds: number[];
  onChange: (ids: number[]) => void;
  max?: number;
  hint?: string;
  preset?: ImagePreset;
}) {
  return (
    <MediaField
      mediaIds={mediaIds}
      onChange={onChange}
      max={max}
      hint={hint}
      preset={preset}
    />
  );
}
