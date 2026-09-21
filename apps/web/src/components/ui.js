import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ---------------------------------------------------------------- surface */
export function Panel({ title, subtitle, action, children, className = '', }) {
    return (_jsxs("section", { className: `bg-white border border-line rounded-lg ${className}`, children: [(title || action) && (_jsxs("header", { className: "flex items-start justify-between gap-4 px-4 py-3 border-b border-line", children: [_jsxs("div", { children: [title && _jsx("h2", { className: "text-[15px] font-semibold text-ink", children: title }), subtitle && _jsx("p", { className: "text-[13px] text-gray-500 mt-0.5", children: subtitle })] }), action] })), children] }));
}
/* ---------------------------------------------------------------- numbers */
export function Stat({ label, value, hint, tone = 'default', onClick, }) {
    const toneRing = {
        default: 'border-line',
        teal: 'border-teal/30',
        amber: 'border-amber/30',
        rose: 'border-rose/30',
        grass: 'border-grass/30',
    }[tone];
    const toneText = {
        default: 'text-ink',
        teal: 'text-teal',
        amber: 'text-amber',
        rose: 'text-rose',
        grass: 'text-grass',
    }[tone];
    const Tag = onClick ? 'button' : 'div';
    return (_jsxs(Tag, { onClick: onClick, className: `bg-white border ${toneRing} rounded-lg px-4 py-3 text-left w-full ${onClick ? 'hover:border-teal/60 transition-colors' : ''}`, children: [_jsx("div", { className: "text-[12.5px] text-gray-500", children: label }), _jsx("div", { className: `text-2xl font-semibold tabular mt-1 ${toneText}`, children: value }), hint && _jsx("div", { className: "text-[12px] text-gray-400 mt-0.5", children: hint })] }));
}
/* ---------------------------------------------------------------- status */
const badgeTones = {
    present: 'bg-grass-light text-grass border-grass/20',
    absent: 'bg-rose-light text-rose border-rose/20',
    pending: 'bg-amber-light text-amber border-amber/20',
    info: 'bg-teal-light text-teal border-teal/20',
    muted: 'bg-gray-100 text-gray-600 border-gray-200',
};
export function Badge({ children, tone = 'muted', }) {
    return (_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium border ${badgeTones[tone]}`, children: children }));
}
export function statusTone(status) {
    const s = (status || '').toUpperCase();
    if (['PRESENT', 'APPROVED', 'SUBMITTED', 'EVALUATED', 'PUBLISHED', 'CONDUCTED', 'PAID', 'ASSIGNED'].includes(s))
        return 'present';
    if (['ABSENT', 'REJECTED', 'NEEDS_COVER', 'OVERDUE', 'F'].includes(s))
        return 'absent';
    if (['PENDING', 'LATE', 'ON_LEAVE', 'HALF_DAY', 'MARKS_ENTRY', 'DRAFT'].includes(s))
        return 'pending';
    return 'muted';
}
/* ---------------------------------------------------------------- buttons */
export function Button({ children, variant = 'primary', size = 'md', className = '', ...rest }) {
    const variants = {
        primary: 'bg-teal text-white hover:bg-teal-dark border-teal disabled:bg-teal/50',
        secondary: 'bg-white text-ink hover:bg-canvas border-line',
        ghost: 'bg-transparent text-ink hover:bg-canvas border-transparent',
        danger: 'bg-rose text-white hover:opacity-90 border-rose',
    };
    const sizes = { sm: 'px-2.5 py-1 text-[13px]', md: 'px-3.5 py-2 text-[14px]' };
    return (_jsx("button", { ...rest, className: `inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`, children: children }));
}
/* ---------------------------------------------------------------- inputs */
export function Field({ label, children, hint, }) {
    return (_jsxs("label", { className: "block", children: [_jsx("span", { className: "block text-[13px] font-medium text-gray-700 mb-1", children: label }), children, hint && _jsx("span", { className: "block text-[12px] text-gray-400 mt-1", children: hint })] }));
}
export const inputClass = 'w-full border border-line rounded-md px-3 py-2 text-[14px] bg-white focus:border-teal outline-none';
export function Select(props) {
    return _jsx("select", { ...props, className: `${inputClass} ${props.className || ''}` });
}
export function Input(props) {
    return _jsx("input", { ...props, className: `${inputClass} ${props.className || ''}` });
}
/* ---------------------------------------------------------------- table */
export function Table({ head, children }) {
    return (_jsx("div", { className: "scroll-x", children: _jsxs("table", { className: "w-full text-[13.5px]", children: [_jsx("thead", { children: _jsx("tr", { className: "text-left text-gray-500 border-b border-line", children: head.map((h, i) => (_jsx("th", { className: "font-medium px-4 py-2.5 whitespace-nowrap", children: h }, i))) }) }), _jsx("tbody", { className: "divide-y divide-line", children: children })] }) }));
}
export function Td({ children, className = '', colSpan, }) {
    return (_jsx("td", { colSpan: colSpan, className: `px-4 py-2.5 align-middle ${className}`, children: children }));
}
/* ---------------------------------------------------------------- states */
export function Empty({ title, hint, action }) {
    return (_jsxs("div", { className: "px-4 py-10 text-center", children: [_jsx("p", { className: "text-[14px] font-medium text-ink", children: title }), hint && _jsx("p", { className: "text-[13px] text-gray-500 mt-1 max-w-md mx-auto", children: hint }), action && _jsx("div", { className: "mt-4", children: action })] }));
}
export function Loading({ label = 'Loading' }) {
    return _jsxs("div", { className: "px-4 py-10 text-center text-[13.5px] text-gray-500", children: [label, "\u2026"] });
}
export function ErrorNote({ text }) {
    return (_jsx("div", { className: "border border-rose/25 bg-rose-light text-rose rounded-md px-3 py-2 text-[13.5px]", children: text }));
}
export function Note({ children }) {
    return (_jsx("div", { className: "border border-amber/25 bg-amber-light text-amber rounded-md px-3 py-2 text-[13.5px]", children: children }));
}
/* ---------------------------------------------------------------- bars */
export function PercentBar({ value, min = 75 }) {
    const below = value < min;
    return (_jsxs("div", { className: "flex items-center gap-2 min-w-[120px]", children: [_jsx("div", { className: "h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden", children: _jsx("div", { className: `h-full rounded-full ${below ? 'bg-rose' : 'bg-grass'}`, style: { width: `${Math.min(value, 100)}%` } }) }), _jsxs("span", { className: `tabular text-[13px] w-12 text-right ${below ? 'text-rose font-medium' : 'text-gray-600'}`, children: [value, "%"] })] }));
}
export function PageTitle({ title, subtitle, action }) {
    return (_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-3 mb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-[22px] font-semibold text-ink leading-tight", children: title }), subtitle && _jsx("p", { className: "text-[13.5px] text-gray-500 mt-1", children: subtitle })] }), action] }));
}
