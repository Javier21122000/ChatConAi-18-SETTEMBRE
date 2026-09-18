import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, LoaderCircle, Moon, Sun, X } from 'lucide-react';
import type { UserView } from '../types';

export function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`} aria-label="TxTr">TxTr<span className="brand-dot">.</span></span>;
}
export function Avatar({ user, size = 'md' }: { user: UserView; size?: 'sm' | 'md' | 'lg' }) {
  return <span aria-hidden="true" className={`avatar avatar-${size} avatar-tone-${user.id % 6}`}>
    {user.username.replace(/[_\s]/g, '').slice(0, 2).toUpperCase()}
  </span>;
}
export function ThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  return <button className="icon-button theme-toggle" onClick={onToggle} aria-label={theme === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro'} title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}>
    <AnimatePresence mode="wait" initial={false}><motion.span key={theme} initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }}>
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </motion.span></AnimatePresence>
  </button>;
}
export function Spinner({ label = 'Caricamento' }: { label?: string }) {
  return <LoaderCircle size={18} className="animate-spin" role="status" aria-label={label} />;
}
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} aria-labelledby="modal-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-inner"><header className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Chiudi"><X size={20} /></button></header>{children}</div>
  </dialog>;
}
export interface ToastMessage { id: number; text: string; kind: 'success' | 'error' | 'info' }
export function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 5500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);
  return createPortal(<div className="toast-region" aria-live="polite"><AnimatePresence>{toast && <motion.div key={toast.id} className={`toast toast-${toast.kind}`} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
    {toast.kind === 'success' && <span className="toast-check"><Check size={15} /></span>}
    <span>{toast.text}</span><button className="icon-button" onClick={onClose} aria-label="Chiudi notifica"><X size={16} /></button>
  </motion.div>}</AnimatePresence></div>, document.querySelector('dialog[open]') || document.body);
}
