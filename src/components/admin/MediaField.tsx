'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  api,
  uploadMedia,
  ApiError,
  type UploadedMedia
} from '@/lib/admin-client';
import {
  ACCEPTED_IMAGES,
  IMAGE_PRESETS,
  type ImagePreset
} from '@/lib/media/presentation';
import { useUploadActivity } from './MediaForm';
import { UploadIcon, TrashIcon, CloseIcon } from '@/components/ui/Icons';

type UploadItem = {
  key: number;
  file: File;
  url: string;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
};
type Asset = UploadedMedia & { usedCount: number };

export default function MediaField({
  mediaIds,
  onChange,
  max = 1,
  preset = 'product',
  label,
  hint
}: {
  mediaIds: number[];
  onChange: (ids: number[]) => void;
  max?: number;
  preset?: ImagePreset;
  label?: string;
  hint?: string;
}) {
  const t = useTranslations('media');
  const uid = useId();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedRef = useRef(mediaIds);
  const running = useRef(false);
  const mounted = useRef(true);
  const urls = useRef<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const begin = useUploadActivity();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState('');
  const [library, setLibrary] = useState<Asset[]>([]);
  const [libraryState, setLibraryState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [selection, setSelection] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [dimensions, setDimensions] = useState<
    Record<number, { width: number; height: number }>
  >({});
  const spec = IMAGE_PRESETS[preset];

  useEffect(() => {
    selectedRef.current = mediaIds;
  }, [mediaIds]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  const update = (ids: number[]) => {
    selectedRef.current = ids;
    onChange(ids);
  };
  const patch = (key: number, value: Partial<UploadItem>) => {
    if (mounted.current)
      setQueue((items) =>
        items.map((item) => (item.key === key ? { ...item, ...value } : item))
      );
  };

  async function run(items: UploadItem[]) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const finish = begin();
    controller.current = new AbortController();
    try {
      for (const item of items) {
        if (controller.current.signal.aborted) break;
        if (max > 1 && selectedRef.current.length >= max) {
          patch(item.key, {
            status: 'error',
            error: t('limit', { count: max })
          });
          continue;
        }
        patch(item.key, { status: 'uploading', progress: 0, error: undefined });
        try {
          const asset = await uploadMedia(
            item.file,
            (progress) => patch(item.key, { progress }),
            controller.current.signal
          );
          if (!mounted.current) break;
          const next =
            max === 1
              ? [asset.id]
              : [...new Set([...selectedRef.current, asset.id])].slice(0, max);
          update(next); // Commit each success; a later failure cannot discard it.
          setDimensions((d) => ({
            ...d,
            [asset.id]: { width: asset.width, height: asset.height }
          }));
          patch(item.key, { status: 'done', progress: 100 });
        } catch (error) {
          if (!mounted.current) break;
          const code = error instanceof ApiError ? error.code : 'failed';
          patch(item.key, {
            status: 'error',
            error: t(
              [
                'fileTooLarge',
                'invalidFileType',
                'networkError',
                'rateLimited'
              ].includes(code)
                ? code
                : 'failed'
            )
          });
        }
      }
    } finally {
      running.current = false;
      finish();
      if (mounted.current) setBusy(false);
    }
  }

  function choose(files: File[]) {
    if (!files.length || running.current) return;
    const available =
      max === 1 ? 1 : Math.max(0, max - selectedRef.current.length);
    setNotice(files.length > available ? t('limit', { count: max }) : '');
    const items = files.slice(0, available).map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      return {
        key: ++sequence.current,
        file,
        url,
        progress: 0,
        status: 'queued' as const
      };
    });
    setQueue((previous) => [
      ...previous.filter((item) => item.status === 'error'),
      ...items
    ]);
    if (items.length) void run(items);
  }

  async function loadLibrary() {
    setLibraryState('loading');
    try {
      const result = await api.get<{ media: Asset[] }>('/api/admin/media');
      if (mounted.current) {
        setLibrary(result.media);
        setLibraryState('ready');
      }
    } catch {
      if (mounted.current) setLibraryState('error');
    }
  }
  function openLibrary() {
    setSelection([...mediaIds]);
    setQuery('');
    setNotice('');
    dialog.current?.showModal();
    void loadLibrary();
  }
  function toggle(id: number) {
    setSelection((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : max === 1
          ? [id]
          : current.length < max
            ? [...current, id]
            : current
    );
  }
  function move(index: number, offset: number) {
    const next = [...mediaIds];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    update(next);
  }

  return (
    <section
      className="media-field"
      aria-labelledby={`${uid}-label`}
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 id={`${uid}-label`} className="text-sm font-medium">
          {label ?? t('title')}
        </h3>
        <span className="text-xs text-stone-deep" dir="ltr">
          {mediaIds.length} / {max}
        </span>
      </div>
      {mediaIds.length > 0 && (
        <div
          className={`media-selection ${max === 1 ? 'media-selection-single' : ''}`}
        >
          {mediaIds.map((id, index) => (
            <div className="media-tile" key={`${id}-${index}`}>
              <div
                className="media-tile-image"
                style={{ aspectRatio: spec.ratio }}
              >
                {/* The admin shows original assets; the storefront retains Next Image optimization. */}
                <img
                  src={`/api/media/${id}`}
                  alt={t('imageNumber', { number: index + 1 })}
                  style={{ objectFit: spec.fit }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setDimensions((d) => ({
                      ...d,
                      [id]: {
                        width: img.naturalWidth,
                        height: img.naturalHeight
                      }
                    }));
                  }}
                />
                {max > 1 && index === 0 && (
                  <span className="media-cover-label">{t('coverLabel')}</span>
                )}
              </div>
              <div className="media-tile-actions">
                {max > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      title={t('makeCover')}
                      aria-label={t('makeCover')}
                      onClick={() =>
                        update([id, ...mediaIds.filter((_, i) => i !== index)])
                      }
                    >
                      ☆
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      aria-label={t('moveEarlier')}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === mediaIds.length - 1}
                      aria-label={t('moveLater')}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={busy}
                  aria-label={t('remove')}
                  onClick={() => update(mediaIds.filter((_, i) => i !== index))}
                >
                  <TrashIcon size={15} />
                </button>
              </div>
              {dimensions[id] && (
                <p className="text-[11px] text-stone-deep mt-2" dir="ltr">
                  {dimensions[id].width} × {dimensions[id].height} px
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {(max === 1 || mediaIds.length < max) && (
        <div
          className={`media-dropzone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(Array.from(e.dataTransfer.files));
          }}
        >
          <UploadIcon size={24} />
          <p className="text-sm">{t('drop')}</p>
          <p className="text-xs text-stone-deep">{t('formats')}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {t(max === 1 && mediaIds.length ? 'replace' : 'uploadFile')}
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={busy}
              onClick={openLibrary}
            >
              {t('library')}
            </button>
          </div>
        </div>
      )}
      {max > 1 && mediaIds.length >= max && (
        <button
          type="button"
          className="admin-btn-secondary mt-3"
          disabled={busy}
          onClick={openLibrary}
        >
          {t('library')}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGES}
        multiple={max > 1}
        className="sr-only"
        tabIndex={-1}
        aria-label={t('upload')}
        onChange={(e) => {
          choose(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <p className="mt-3 text-xs font-medium text-stone-deep">
        {t('recommended', {
          width: spec.width,
          height: spec.height,
          ratio: spec.ratio.replace(' / ', ':')
        })}
      </p>
      <p className="mt-1 text-xs text-stone-deep">
        {hint ?? t('recommendHint')}
      </p>
      {mediaIds.some(
        (id) =>
          dimensions[id] &&
          (dimensions[id].width < spec.width / 2 ||
            dimensions[id].height < spec.height / 2)
      ) && <p className="mt-2 text-xs text-[#8c6a2f]">{t('lowResolution')}</p>}
      {notice && (
        <p role="status" className="mt-2 text-xs text-stone-deep">
          {notice}
        </p>
      )}
      {queue.length > 0 && (
        <ul className="upload-queue" aria-live="polite">
          {queue.map((item) => (
            <li key={item.key}>
              <img src={item.url} alt="" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">{item.file.name}</p>
                <p className="text-xs text-stone-deep mt-1">
                  {item.status === 'error'
                    ? item.error
                    : item.status === 'done'
                      ? t('uploaded')
                      : item.progress === 100
                        ? t('processing')
                        : `${t('uploading')} ${item.progress}%`}
                </p>
                {item.status === 'uploading' && (
                  <progress
                    max="100"
                    value={item.progress}
                    aria-label={t('progress')}
                    className="w-full h-1"
                  />
                )}
              </div>
              {item.status === 'error' && (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={busy}
                  onClick={() => void run([item])}
                >
                  {t('retry')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!busy && queue.some((item) => item.status === 'done') && (
        <p className="text-xs text-stone-deep mt-3" role="status">
          {t('ready')}
        </p>
      )}

      <dialog
        ref={dialog}
        className="media-dialog"
        aria-labelledby={`${uid}-library`}
      >
        <div className="media-dialog-heading">
          <div>
            <h2 id={`${uid}-library`} className="display-heading text-2xl">
              {t('libraryTitle')}
            </h2>
            <p className="mt-2 text-sm text-stone-deep">{t('libraryHint')}</p>
          </div>
          <button
            type="button"
            aria-label={t('close')}
            className="icon-button"
            onClick={() => dialog.current?.close()}
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="p-4 md:p-6">
          <input
            className="admin-input"
            type="search"
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            aria-label={t('search')}
          />
          {libraryState === 'loading' && (
            <p role="status" className="py-12 text-center">
              {t('processing')}
            </p>
          )}
          {libraryState === 'error' && (
            <div className="py-10 text-center">
              <p role="alert">{t('libraryError')}</p>
              <button
                type="button"
                className="admin-btn mt-3"
                onClick={() => void loadLibrary()}
              >
                {t('retry')}
              </button>
            </div>
          )}
          {libraryState === 'ready' && (
            <div className="media-library-grid">
              {library
                .filter((asset) =>
                  `${asset.id} ${asset.width} ${asset.height}`.includes(
                    query.trim()
                  )
                )
                .map((asset) => (
                  <button
                    type="button"
                    className="media-library-item"
                    key={asset.id}
                    aria-pressed={selection.includes(asset.id)}
                    disabled={
                      !selection.includes(asset.id) &&
                      max > 1 &&
                      selection.length >= max
                    }
                    onClick={() => toggle(asset.id)}
                  >
                    <img
                      src={`/api/media/${asset.id}`}
                      alt={t('imageNumber', { number: asset.id })}
                      loading="lazy"
                    />
                    <span dir="ltr">
                      #{asset.id} · {asset.width} × {asset.height}
                    </span>
                    {selection.includes(asset.id) && (
                      <strong>{t('selected')}</strong>
                    )}
                  </button>
                ))}
              {library.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm">
                  {t('libraryEmpty')}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="media-dialog-footer">
          <span className="text-xs text-stone-deep">
            {selection.length} / {max}
          </span>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => dialog.current?.close()}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="admin-btn"
            disabled={libraryState !== 'ready'}
            onClick={() => {
              update(selection);
              dialog.current?.close();
              setNotice(t('ready'));
            }}
          >
            {t('useSelection')}
          </button>
        </div>
      </dialog>
    </section>
  );
}
