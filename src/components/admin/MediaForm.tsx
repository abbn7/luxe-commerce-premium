'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  type ComponentProps
} from 'react';
import { useTranslations } from 'next-intl';

const UploadContext = createContext<() => () => void>(() => () => {});
export const useUploadActivity = () => useContext(UploadContext);

/** Saving before a pending upload completes would persist an obsolete media ID. */
export default function MediaForm({
  children,
  onSubmit,
  ...props
}: ComponentProps<'form'>) {
  const pendingRef = useRef(0);
  const [pending, setPending] = useState(0);
  const t = useTranslations('media');
  const begin = useCallback(() => {
    pendingRef.current++;
    setPending(pendingRef.current);
    let finished = false;
    return () => {
      if (!finished) {
        finished = true;
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        setPending(pendingRef.current);
      }
    };
  }, []);
  return (
    <UploadContext.Provider value={begin}>
      <form
        {...props}
        aria-busy={pending > 0}
        onSubmit={(event) => {
          if (pendingRef.current) {
            event.preventDefault();
            return;
          }
          onSubmit?.(event);
        }}
      >
        {pending > 0 && (
          <p className="media-save-notice" role="status">
            {t('waitToSave')}
          </p>
        )}
        {children}
      </form>
    </UploadContext.Provider>
  );
}
