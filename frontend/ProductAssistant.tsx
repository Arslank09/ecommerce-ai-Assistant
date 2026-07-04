'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, RotateCcw, Send, ShoppingBag, Store } from 'lucide-react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Recommendation = {
  id?: string;
  title: string;
  price: number;
  category: string;
  images?: string[];
};
type Mode = 'auto' | 'assistant' | 'agent';

const ASSISTANT_URL =
  process.env.NEXT_PUBLIC_ASSISTANT_API_URL ?? 'http://localhost:8001';

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hi! I'm your AI Copilot. Ask about a product, or tell me what you need (e.g. \"my AC broke\") and I'll recommend items from the store.",
};

/**
 * AI Copilot — a full modal. Chat on the left, product recommendations on the
 * right. Controlled by a parent trigger via `open` / `onClose`.
 * Requires: Tailwind CSS + lucide-react.
 */
export function ProductAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('auto');
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [render, setRender] = useState(false); // keep mounted during exit animation
  const [show, setShow] = useState(false);      // toggles the enter/exit classes

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Mount with an enter animation; on close, play the exit before unmounting.
  useEffect(() => {
    if (open) {
      setRender(true);
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    }
    setShow(false);
    const id = setTimeout(() => setRender(false), 220);
    return () => clearTimeout(id);
  }, [open]);

  function resetChat() {
    setMessages([GREETING]);
    setRecs([]);
    setInput('');
  }

  function openProduct(r: Recommendation) {
    // Change this route to match your store's product page.
    router.push(r.id ? `/browse/${r.id}` : '/browse');
    onClose();
  }

  async function send() {
    const question = input.trim();
    if (!question || loading) return;

    const history = messages;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const res = await fetch(`${ASSISTANT_URL}/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history, mode }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { answer?: string; recommendations?: Recommendation[] } = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer ?? 'No response.' }]);
      if (data.recommendations && data.recommendations.length > 0) {
        setRecs(data.recommendations);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I couldn't reach the Copilot service. Is it running at ${ASSISTANT_URL}?` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void send();
  }

  if (!render) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-3 transition-colors duration-200 md:p-6 ${show ? 'bg-black/50' : 'bg-black/0'}`}
      onClick={onClose}
    >
      <div
        className={`flex h-[85vh] w-full max-w-5xl origin-top-left overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 ease-out ${show ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes copilotCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
        {/* ============ LEFT: chat ============ */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight text-neutral-900">AI Copilot</p>
                <p className="text-[11px] leading-tight text-neutral-500">Assistant &amp; shopping agent</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                title="New chat"
                aria-label="New chat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-neutral-50/60 px-5 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <span
                  className={
                    'inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ' +
                    (m.role === 'user'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-800 ring-1 ring-neutral-200')
                  }
                >
                  {m.content}
                </span>
              </div>
            ))}
            {loading && <p className="pl-1 text-xs text-neutral-400">Copilot is thinking…</p>}
            <div ref={endRef} />
          </div>

          {/* Input + mode selector */}
          <div className="border-t border-neutral-200 p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-1.5 focus-within:border-neutral-900">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                title="Mode"
                className="shrink-0 rounded-xl bg-neutral-100 px-2 py-1.5 text-xs font-medium text-neutral-700 outline-none"
              >
                <option value="auto">Auto</option>
                <option value="assistant">Assistant</option>
                <option value="agent">Agent</option>
              </select>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about a product, or tell me what you need…"
                className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading}
                aria-label="Send"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-black disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ============ RIGHT: recommendations ============ */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-neutral-200 bg-neutral-50 md:flex">
          <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
            <Store className="h-4 w-4 text-neutral-700" />
            <p className="text-sm font-semibold text-neutral-900">Recommendations</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {recs.length === 0 ? (
              <div className="mt-8 px-4 text-center text-xs text-neutral-400">
                Tell the Copilot what you need and matching products will appear here.
              </div>
            ) : (
              recs.map((r, i) => (
                <button
                  key={r.id ?? i}
                  type="button"
                  onClick={() => openProduct(r)}
                  style={{ animation: 'copilotCardIn .25s ease both', animationDelay: `${i * 45}ms` }}
                  className="group block w-full rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition hover:border-neutral-900 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
                    {r.images && r.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.images[0]} alt={r.title} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-7 w-7 text-neutral-300" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-neutral-800">{r.title}</p>
                  <p className="text-xs text-neutral-500">{r.category}</p>
                  <p className="mt-1 text-sm font-bold text-neutral-900">Rs {r.price}</p>
                  <span className="mt-1.5 inline-block text-[11px] font-medium text-neutral-400 transition group-hover:text-neutral-900">
                    View product →
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
