'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SearchIcon, CloseIcon, ArrowIcon } from '@/components/ui/Icons';
import Modal from '@/components/ui/Modal';
import SmartImage from '@/components/ui/SmartImage';
import { formatPrice } from '@/lib/format';
import type { Locale } from '@/i18n/routing';

interface SearchResult {
  id: number;
  slug: string;
  name: string;
  price: number;
  imageId: number | null;
}

export default function SearchOverlay({
  open,
  onClose,
  currency
}: {
  open: boolean;
  currency: { en: string; ar: string };
  onClose: () => void;
}) {
  const t = useTranslations('search');
  const tNav = useTranslations('nav');
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle' | 'searching' | 'done' | 'error'>(
    'idle'
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setState('idle');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    abortRef.current?.abort();
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setState('idle');
      setResults([]);
      return;
    }

    setState('searching');
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(q)}&limit=8`,
          {
            signal: controller.signal
          }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (controller.signal.aborted) return;
        setResults(
          (data.products as Array<Record<string, unknown>>).map((p) => ({
            id: p.id as number,
            slug: p.slug as string,
            name: (locale === 'ar' ? p.name_ar : p.name_en) as string,
            price: p.price as number,
            imageId: p.image_ids
              ? (JSON.parse(p.image_ids as string)[0] ?? null)
              : null
          }))
        );
        setState('done');
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setState('error');
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, locale, open]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={tNav('search')}
      className="search-dialog"
    >
      <div className="bg-porcelain">
        <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 md:py-10">
          <div className="flex items-center gap-4 border-b border-line pb-4">
            <SearchIcon size={22} className="text-stone shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              className="min-w-0 flex-1 bg-transparent text-lg md:text-xl outline-none placeholder:text-stone"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={tNav('closeMenu')}
              className="p-2"
            >
              <CloseIcon size={22} />
            </button>
          </div>

          <div className="py-6" aria-live="polite">
            {state === 'error' && (
              <p role="alert" className="py-8 text-center">
                {t('error')}
              </p>
            )}
            {state === 'idle' && query.trim().length < 2 && (
              <p className="text-sm text-stone text-center py-8">
                {t('minChars')}
              </p>
            )}
            {state === 'searching' && (
              <p className="text-sm text-stone text-center py-8">
                {t('searching')}
              </p>
            )}
            {state === 'done' && results.length === 0 && (
              <div className="text-center py-10">
                <p className="display-heading text-2xl mb-2">
                  {t('noResults')}
                </p>
                <p className="text-sm text-stone">{t('noResultsBody')}</p>
                <Link
                  href="/collections"
                  onClick={onClose}
                  className="btn-outline mt-6"
                >
                  {t('exploreCollections')}
                </Link>
              </div>
            )}
            {results.length > 0 && (
              <ul className="divide-y divide-line">
                {results.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/product/${r.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-4 py-4 group"
                    >
                      <div className="relative w-16 h-20 shrink-0 bg-ivory overflow-hidden">
                        <SmartImage
                          mediaId={r.imageId}
                          alt={r.name}
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate group-hover:text-accent transition-colors">
                          {r.name}
                        </p>
                        <p className="text-sm text-stone mt-1">
                          {formatPrice(
                            r.price,
                            locale,
                            currency.en,
                            currency.ar
                          )}
                        </p>
                      </div>
                      <ArrowIcon
                        size={18}
                        className="text-stone group-hover:text-ink transition-colors"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
