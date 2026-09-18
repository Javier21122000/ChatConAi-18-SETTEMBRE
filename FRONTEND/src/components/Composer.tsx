import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Sparkles, X } from 'lucide-react';
import { api, errorMessage } from '../services/api';
import { suggestionHistory } from '../lib/messages';
import type { MessageResponse } from '../types';
import { Spinner } from './ui';

export function Composer({ recipientId, userId, messages, draft, setDraft, onSend, sending, demo }: {
  recipientId: number; userId: number; messages: MessageResponse[]; draft: string; setDraft: (value: string) => void;
  onSend: (content: string) => Promise<void>; sending: boolean; demo: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);
  useLayoutEffect(() => {
    if (input.current) { input.current.style.height = 'auto'; input.current.style.height = `${Math.min(input.current.scrollHeight, 140)}px`; }
  }, [draft]);
  async function suggest() {
    if (thinking || cooldown || messages.length === 0) return;
    setThinking(true); setError(''); setSuggestion('');
    const request = new AbortController(); controller.current = request;
    try {
      if (demo) {
        await new Promise(resolve => setTimeout(resolve, 650));
        if (!request.signal.aborted) setSuggestion('Mi sembra un’ottima idea! A che ora ci vediamo?');
      } else {
        const result = await api.suggest({ recipientId, history: suggestionHistory(messages, userId, recipientId) }, request.signal);
        if (!request.signal.aborted) { setSuggestion(result.suggestion); setCooldown(15); }
      }
    } catch (err) { if (!request.signal.aborted) setError(errorMessage(err)); }
    finally { if (!request.signal.aborted) setThinking(false); }
  }
  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!draft.trim() || sending || draft.trim().length > 4000) return;
    setError('');
    try { await onSend(draft); setDraft(''); setSuggestion(''); input.current?.focus(); }
    catch (err) { setError(errorMessage(err)); }
  }
  return <div className="composer-section">
    <AnimatePresence>{(thinking || suggestion) && <motion.div className="suggestion-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
      <div className="suggestion-label"><span><Sparkles size={14} />{demo ? 'SUGGERIMENTO DI ESEMPIO' : 'UN’IDEA PER RISPONDERE'}</span><button className="icon-button" onClick={() => { controller.current?.abort(); setThinking(false); setSuggestion(''); }} aria-label="Chiudi suggerimento"><X size={16} /></button></div>
      {thinking ? <div className="thinking" role="status"><span className="thinking-dots"><i /><i /><i /></span>Sto cercando le parole giuste…</div> :
        <button className="suggestion-pill" disabled={sending} onClick={() => { setDraft(suggestion.slice(0, 4000)); setSuggestion(''); input.current?.focus(); }}>{suggestion}<ArrowUp size={16} /></button>}
    </motion.div>}</AnimatePresence>
    {error && <p className="composer-error" role="alert">{error}<button className="icon-button" onClick={() => setError('')} aria-label="Chiudi errore"><X size={14} /></button></p>}
    <form className="composer" onSubmit={send}>
      <textarea ref={input} value={draft} onChange={event => setDraft(event.target.value)} rows={1} maxLength={4000} placeholder="Scrivi un messaggio…" aria-label="Scrivi un messaggio" disabled={sending}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
      <div className="composer-actions"><button type="button" className={`icon-button ai-button ${thinking ? 'thinking-active' : ''}`} onClick={() => void suggest()} disabled={thinking || cooldown > 0 || !messages.length || sending} aria-label="Consigliami il prossimo messaggio" title={cooldown ? `Nuovo suggerimento tra ${cooldown}s` : messages.length ? 'Consigliami il prossimo messaggio · usa fino a 20 messaggi della chat' : 'Scambia un messaggio per ricevere un suggerimento'}><Sparkles size={21} /></button><span className="composer-divider" /><button className="send-button" disabled={!draft.trim() || sending} aria-label="Invia messaggio">{sending ? <Spinner label="Invio in corso" /> : <ArrowUp size={22} strokeWidth={2.3} />}</button></div>
    </form>
    <div className="composer-caption"><span><Sparkles size={12} />Una mano con le parole? Prova il suggerimento AI.</span><span>{draft.length > 3600 ? `${draft.length}/4000` : 'Invio per inviare'}</span></div>
  </div>;
}
