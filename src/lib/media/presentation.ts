/** Placement data is separate from the immutable uploaded asset. */
export interface ImagePresentation {
  fit: 'cover' | 'contain';
  x: number;
  y: number;
  mobileX: number;
  mobileY: number;
}

export const DEFAULT_PRESENTATION: ImagePresentation = {
  fit: 'cover',
  x: 50,
  y: 50,
  mobileX: 50,
  mobileY: 50
};

export function readPresentation(value: unknown): ImagePresentation {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = null;
    }
  }
  const input =
    value && typeof value === 'object'
      ? (value as Partial<ImagePresentation>)
      : {};
  const coordinate = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.min(100, Math.max(0, v))
      : 50;
  return {
    fit: input.fit === 'contain' ? 'contain' : 'cover',
    x: coordinate(input.x),
    y: coordinate(input.y),
    mobileX: coordinate(input.mobileX ?? input.x),
    mobileY: coordinate(input.mobileY ?? input.y)
  };
}

export const IMAGE_PRESETS = {
  product: { ratio: '3 / 4', width: 1500, height: 2000, fit: 'contain' },
  hero: { ratio: '16 / 9', width: 1920, height: 1080, fit: 'cover' },
  mobile: { ratio: '4 / 5', width: 1200, height: 1500, fit: 'cover' },
  editorial: { ratio: '4 / 5', width: 1600, height: 2000, fit: 'cover' },
  banner: { ratio: '12 / 5', width: 1920, height: 800, fit: 'cover' },
  lookbook: { ratio: '3 / 4', width: 1500, height: 2000, fit: 'cover' },
  logo: { ratio: '3 / 1', width: 1200, height: 400, fit: 'contain' },
  favicon: { ratio: '1 / 1', width: 512, height: 512, fit: 'contain' }
} as const;
export type ImagePreset = keyof typeof IMAGE_PRESETS;

export const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/avif';
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export function validateImageFile(file: {
  size: number;
  type: string;
}): 'fileTooLarge' | 'invalidFileType' | null {
  if (file.size > MAX_IMAGE_BYTES) return 'fileTooLarge';
  if (
    file.size === 0 ||
    (file.type && !ACCEPTED_IMAGES.split(',').includes(file.type))
  )
    return 'invalidFileType';
  return null; // Some galleries omit MIME. The server validates the decoded bytes.
}

export function sectionReferencesMedia(
  config: Record<string, unknown>,
  id: number
): boolean {
  return config.imageMediaId === id || config.mobileImageMediaId === id;
}
