import { haptic } from './haptics';

export type ToastKind = 'success' | 'error' | 'info';
export type ToastMsg = { id: number; text: string; kind: ToastKind };

let listener: ((m: ToastMsg) => void) | null = null;
let seq = 0;

export const subscribeToast = (fn: (m: ToastMsg) => void) => {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
};

const emit = (text: string, kind: ToastKind) => {
  seq += 1;
  listener?.({ id: seq, text, kind });
};

export const toast = {
  success: (text: string) => {
    haptic.success();
    emit(text, 'success');
  },
  error: (text: string) => {
    haptic.error();
    emit(text, 'error');
  },
  info: (text: string) => emit(text, 'info'),
};
