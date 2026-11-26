import { Bot, LoaderCircle, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppLocale } from './studio-localization';

type Message = { role: 'user' | 'assistant'; content: string };

const COPY = {
  en: {
    open: 'Open Adigun BOT', close: 'Close Adigun BOT', title: 'Adigun BOT',
    intro: 'Ask about cabin-lighting scenes, zones, RGBW controls, or the simulator. I only receive the text you send; I cannot view or change your project.',
    consent: 'Send my message to the AI copilot for a reply.', placeholder: 'Ask about a cabin-lighting scene…',
    send: 'Send', thinking: 'Thinking…', unavailable: 'The copilot is unavailable right now. Your project has not been changed.',
    you: 'You', bot: 'Adigun BOT',
  },
  de: {
    open: 'Adigun BOT öffnen', close: 'Adigun BOT schließen', title: 'Adigun BOT',
    intro: 'Frage zu Kabinenlichtszenen, Zonen, RGBW-Steuerungen oder zum Simulator. Ich erhalte nur den Text, den du sendest; ich kann dein Projekt weder sehen noch ändern.',
    consent: 'Meine Nachricht für eine Antwort an den KI-Copiloten senden.', placeholder: 'Frage zu einer Kabinenlichtszene…',
    send: 'Senden', thinking: 'Denke nach…', unavailable: 'Der Copilot ist gerade nicht verfügbar. Dein Projekt wurde nicht geändert.',
    you: 'Du', bot: 'Adigun BOT',
  },
  yo: {
    open: 'Ṣí Adigun BOT', close: 'Pa Adigun BOT', title: 'Adigun BOT',
    intro: 'Béèrè nípa ìmọ́lẹ̀ inú ọkọ̀ òfurufú, àwọn agbègbè, ìṣàkóso RGBW, tàbí simulator. Ọ̀rọ̀ tí o bá fi ránṣẹ́ nìkan ni mo ń gba; mi ò lè rí tàbí yí iṣẹ́ rẹ padà.',
    consent: 'Fi ọ̀rọ̀ mi ránṣẹ́ sí olùrànlọ́wọ́ AI kí ó dáhùn.', placeholder: 'Béèrè nípa ìmọ́lẹ̀ inú ọkọ̀…',
    send: 'Fi ránṣẹ́', thinking: 'Mo ń ronú…', unavailable: 'Olùrànlọ́wọ́ kò sí báyìí. A kò yí iṣẹ́ rẹ padà.',
    you: 'Ìwọ', bot: 'Adigun BOT',
  },
  pcm: {
    open: 'Open Adigun BOT', close: 'Close Adigun BOT', title: 'Adigun BOT',
    intro: 'Ask about cabin-lighting scenes, zones, RGBW controls, or the simulator. Na only the text wey you send I go receive; I no fit see or change your project.',
    consent: 'Send my message to the AI copilot make e reply.', placeholder: 'Ask about cabin-lighting scene…',
    send: 'Send', thinking: 'I dey think…', unavailable: 'The copilot no dey available now. Your project no change.',
    you: 'You', bot: 'Adigun BOT',
  },
} satisfies Record<AppLocale, Record<string, string>>;

export default function AdigunBot({ locale }: { locale: AppLocale }) {
  const text = COPY[locale];
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        launchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, busy, unavailable]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !consent || busy) return;
    const nextMessages = [...messages, { role: 'user' as const, content }].slice(-8);
    setMessages(nextMessages);
    setDraft('');
    setBusy(true);
    setUnavailable(false);
    try {
      const response = await fetch('/api/bot', {
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ consent: true, language: locale, messages: nextMessages }),
      });
      const result = await response.json() as { answer?: string };
      if (!response.ok || !result.answer?.trim()) throw new Error('assistant-unavailable');
      setMessages((current) => [...current, { role: 'assistant' as const, content: result.answer!.trim() }].slice(-8));
    } catch {
      setUnavailable(true);
    } finally {
      setBusy(false);
    }
  }

  return <div className="product-bot" lang={locale}>
    {open && <section className="product-bot-panel" id="adigun-bot-panel" aria-labelledby="product-bot-title">
      <header className="product-bot-header">
        <span className="product-bot-mark"><Bot size={18} aria-hidden="true" /><strong id="product-bot-title">{text.title}</strong></span>
        <button type="button" className="product-bot-close" aria-label={text.close} onClick={() => { setOpen(false); launchRef.current?.focus(); }}><X size={17} /></button>
      </header>
      <p className="product-bot-intro">{text.intro}</p>
      <div className="product-bot-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
        {messages.map((message, index) => <article className={`product-bot-message ${message.role}`} key={`${index}-${message.role}`}>
          <strong>{message.role === 'user' ? text.you : text.bot}</strong><p>{message.content}</p>
        </article>)}
        {busy && <p className="product-bot-status"><LoaderCircle size={15} className="product-bot-spinner" />{text.thinking}</p>}
        {unavailable && <p className="product-bot-error" role="status">{text.unavailable}</p>}
      </div>
      <form className="product-bot-form" onSubmit={submit}>
        <label className="product-bot-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />{text.consent}</label>
        <textarea ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 1000))} maxLength={1000} rows={2} placeholder={text.placeholder} aria-label={text.placeholder} />
        <button type="submit" disabled={!consent || !draft.trim() || busy}><Send size={15} />{text.send}</button>
      </form>
    </section>}
    <button ref={launchRef} type="button" className="product-bot-launch" aria-label={open ? text.close : text.open} aria-expanded={open} aria-controls="adigun-bot-panel" onClick={() => setOpen((value) => !value)}>
      <Bot size={22} aria-hidden="true" /><span>Adigun BOT</span><i aria-hidden="true" />
    </button>
  </div>;
}
