'use client';

import { validateImageFile } from './media/presentation';

export interface UploadedMedia {
  id: number;
  width: number;
  height: number;
  size_bytes: number;
  filename: string;
}

/** XHR exposes actual transferred bytes; 100% is followed by server optimization. */
export function uploadMedia(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<UploadedMedia> {
  const invalid = validateImageFile(file);
  if (invalid) return Promise.reject(new ApiError(invalid, 400));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    xhr.open('POST', '/api/admin/media');
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = xhr.ontimeout = () => {
      cleanup();
      reject(new ApiError('networkError', 0));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new ApiError('aborted', 0));
    };
    xhr.onload = () => {
      cleanup();
      let data: {
        media?: UploadedMedia;
        error?: string;
        retryAfterSeconds?: number;
      } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* Safe generic error below. */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.media) {
        resolve(data.media);
        return;
      }
      const code =
        data.error === 'too_large'
          ? 'fileTooLarge'
          : ['invalid_type', 'decode_failed'].includes(data.error ?? '')
            ? 'invalidFileType'
            : xhr.status === 429
              ? 'rateLimited'
              : 'failed';
      reject(new ApiError(code, xhr.status, undefined, data.retryAfterSeconds));
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) {
      cleanup();
      reject(new ApiError('aborted', 0));
      return;
    }
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

/**
 * Thin fetch wrapper for admin API routes.
 * Throws ApiError with a machine-readable code for UI handling.
 */
export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
  detail?: string;

  constructor(
    code: string,
    status: number,
    fieldErrors?: Record<string, string>,
    retryAfterSeconds?: number,
    detail?: string
  ) {
    super(code);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = retryAfterSeconds;
    this.detail = detail;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...init?.headers } });
  const data = (await res.json().catch(() => null)) as
    | (T & {
        error?: string;
        fieldErrors?: Record<string, string>;
        retryAfterSeconds?: number;
        detail?: string;
      })
    | null;

  if (!res.ok) {
    throw new ApiError(
      data?.error ?? `http_${res.status}`,
      res.status,
      data?.fieldErrors,
      data?.retryAfterSeconds,
      data?.detail
    );
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' })
};

/** Upload one image file through the media pipeline. Returns the media id. */
export async function uploadImage(file: File): Promise<number> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/admin/media', { method: 'POST', body: form });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    media?: { id: number };
    error?: string;
  } | null;

  if (!res.ok || !data?.media) {
    const code = data?.error ?? `http_${res.status}`;
    if (code === 'too_large') throw new ApiError('fileTooLarge', res.status);
    if (code === 'invalid_type' || code === 'decode_failed')
      throw new ApiError('invalidFileType', res.status);
    throw new ApiError(code, res.status);
  }
  return data.media.id;
}
