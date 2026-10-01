import { useEffect, useState } from 'react';

import { lockScroll } from '@/ui/motion';

import { lightboxKey, stepPhoto } from './model';

/** Состояние лайтбокса на n кадров: Esc/стрелки (зеркально в RTL), блок прокрутки, пока открыт. */
export const useLightbox = (n: number, dir: 'ltr' | 'rtl') => {
  const [open, setOpen] = useState<number | null>(null);
  const isOpen = open !== null;

  useEffect(() => {
    if (!isOpen) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => {
      const action = lightboxKey(e.key, dir);
      if (action === null) return;
      e.preventDefault();
      if (action === 'close') setOpen(null);
      else setOpen((i) => (i === null ? i : stepPhoto(i, action, n)));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      lockScroll(false);
    };
  }, [isOpen, dir, n]);

  const onStep = (delta: number) => setOpen((i) => (i === null ? i : stepPhoto(i, delta, n)));
  return { open, onOpen: setOpen, onStep };
};
