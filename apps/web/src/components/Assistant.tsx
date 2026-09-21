import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { get, post, errorText } from '../lib/api';

interface Msg {
  from: 'you' | 'assistant';
  text: string;
  tools?: string[];
}

/**
 * The in-app assistant. It answers from live institute data through read-only
 * tools on the server, so it can never show a user something their role cannot see.
 */
export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [mode, setMode] = useState<string>('');
  const history = useRef<any[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || suggestions.length) return;
    get<any>('/assistant/status')
      .then((s) => {
        setSuggestions(s.suggestions || []);
        setMode(s.mode);
      })
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setMsgs((m) => [...m, { from: 'you', text: question }]);
    setInput('');
    setBusy(true);
    try {
      const res = await post<any>('/assistant/chat', { message: question, history: history.current });
      if (res.history) history.current = res.history;
      setMsgs((m) => [...m, { from: 'assistant', text: res.reply, tools: res.toolsUsed }]);
    } catch (err) {
      setMsgs((m) => [...m, { from: 'assistant', text: errorText(err) }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-ink text-white rounded-full pl-3.5 pr-4 py-2.5 shadow-lg hover:bg-ink-700"
      >
        <MessageSquare size={17} />
        <span className="text-[13.5px] font-medium">Ask Campus</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 z-40 w-full sm:w-[380px] h-[70vh] sm:h-[520px] bg-white border border-line sm:rounded-lg shadow-2xl flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-teal" />
          <span className="font-semibold text-[14px] text-ink">Ask Campus</span>
          {mode === 'offline' && (
            <span className="text-[11px] text-gray-400 border border-line rounded px-1.5">offline mode</span>
          )}
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close assistant">
          <X size={18} className="text-gray-400 hover:text-ink" />
        </button>
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {msgs.length === 0 && (
          <div>
            <p className="text-[13.5px] text-gray-600">
              I answer from live data in this system — attendance, substitutions, fees, results.
              You can only see what your role allows.
            </p>
            <div className="mt-3 space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="block w-full text-left text-[13px] border border-line rounded-md px-3 py-2 hover:border-teal hover:bg-teal-light"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={m.from === 'you' ? 'text-right' : ''}>
            <div
              className={`inline-block text-[13.5px] leading-relaxed rounded-lg px-3 py-2 whitespace-pre-wrap text-left max-w-[92%] ${
                m.from === 'you' ? 'bg-ink text-white' : 'bg-canvas text-gray-800 border border-line'
              }`}
            >
              {m.text}
            </div>
            {m.tools?.length ? (
              <div className="text-[11px] text-gray-400 mt-1">read: {m.tools.join(', ')}</div>
            ) : null}
          </div>
        ))}

        {busy && <div className="text-[13px] text-gray-400">Looking it up…</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t border-line p-2.5 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about attendance, fees, results…"
          className="flex-1 border border-line rounded-md px-3 py-2 text-[13.5px] outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-teal text-white rounded-md px-3 disabled:opacity-50"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
