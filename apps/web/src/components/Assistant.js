import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { get, post, errorText } from '../lib/api';
/**
 * The in-app assistant. It answers from live institute data through read-only
 * tools on the server, so it can never show a user something their role cannot see.
 */
export default function Assistant() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [input, setInput] = useState('');
    const [msgs, setMsgs] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [mode, setMode] = useState('');
    const history = useRef([]);
    const scroller = useRef(null);
    useEffect(() => {
        if (!open || suggestions.length)
            return;
        get('/assistant/status')
            .then((s) => {
            setSuggestions(s.suggestions || []);
            setMode(s.mode);
        })
            .catch(() => undefined);
    }, [open]);
    useEffect(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
    }, [msgs, busy]);
    const ask = async (question) => {
        if (!question.trim() || busy)
            return;
        setMsgs((m) => [...m, { from: 'you', text: question }]);
        setInput('');
        setBusy(true);
        try {
            const res = await post('/assistant/chat', { message: question, history: history.current });
            if (res.history)
                history.current = res.history;
            setMsgs((m) => [...m, { from: 'assistant', text: res.reply, tools: res.toolsUsed }]);
        }
        catch (err) {
            setMsgs((m) => [...m, { from: 'assistant', text: errorText(err) }]);
        }
        finally {
            setBusy(false);
        }
    };
    if (!open) {
        return (_jsxs("button", { onClick: () => setOpen(true), className: "fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-ink text-white rounded-full pl-3.5 pr-4 py-2.5 shadow-lg hover:bg-ink-700", children: [_jsx(MessageSquare, { size: 17 }), _jsx("span", { className: "text-[13.5px] font-medium", children: "Ask Campus" })] }));
    }
    return (_jsxs("div", { className: "fixed bottom-0 right-0 sm:bottom-5 sm:right-5 z-40 w-full sm:w-[380px] h-[70vh] sm:h-[520px] bg-white border border-line sm:rounded-lg shadow-2xl flex flex-col", children: [_jsxs("header", { className: "flex items-center justify-between px-4 py-3 border-b border-line", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { size: 16, className: "text-teal" }), _jsx("span", { className: "font-semibold text-[14px] text-ink", children: "Ask Campus" }), mode === 'offline' && (_jsx("span", { className: "text-[11px] text-gray-400 border border-line rounded px-1.5", children: "offline mode" }))] }), _jsx("button", { onClick: () => setOpen(false), "aria-label": "Close assistant", children: _jsx(X, { size: 18, className: "text-gray-400 hover:text-ink" }) })] }), _jsxs("div", { ref: scroller, className: "flex-1 overflow-y-auto px-4 py-3 space-y-3", children: [msgs.length === 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-[13.5px] text-gray-600", children: "I answer from live data in this system \u2014 attendance, substitutions, fees, results. You can only see what your role allows." }), _jsx("div", { className: "mt-3 space-y-1.5", children: suggestions.map((s) => (_jsx("button", { onClick: () => ask(s), className: "block w-full text-left text-[13px] border border-line rounded-md px-3 py-2 hover:border-teal hover:bg-teal-light", children: s }, s))) })] })), msgs.map((m, i) => (_jsxs("div", { className: m.from === 'you' ? 'text-right' : '', children: [_jsx("div", { className: `inline-block text-[13.5px] leading-relaxed rounded-lg px-3 py-2 whitespace-pre-wrap text-left max-w-[92%] ${m.from === 'you' ? 'bg-ink text-white' : 'bg-canvas text-gray-800 border border-line'}`, children: m.text }), m.tools?.length ? (_jsxs("div", { className: "text-[11px] text-gray-400 mt-1", children: ["read: ", m.tools.join(', ')] })) : null] }, i))), busy && _jsx("div", { className: "text-[13px] text-gray-400", children: "Looking it up\u2026" })] }), _jsxs("form", { onSubmit: (e) => {
                    e.preventDefault();
                    ask(input);
                }, className: "border-t border-line p-2.5 flex gap-2", children: [_jsx("input", { value: input, onChange: (e) => setInput(e.target.value), placeholder: "Ask about attendance, fees, results\u2026", className: "flex-1 border border-line rounded-md px-3 py-2 text-[13.5px] outline-none focus:border-teal" }), _jsx("button", { type: "submit", disabled: busy || !input.trim(), className: "bg-teal text-white rounded-md px-3 disabled:opacity-50", "aria-label": "Send", children: _jsx(Send, { size: 16 }) })] })] }));
}
