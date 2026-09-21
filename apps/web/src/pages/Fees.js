import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { money, dateIn, timeAgo } from '../lib/format';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Select, Stat, Table, Td, PageTitle, } from '../components/ui';
export default function Fees() {
    const [tab, setTab] = useState('dues');
    const [studentId, setStudentId] = useState('');
    const { data: summary } = useQuery({ queryKey: ['fee-summary'], queryFn: () => get('/fees/summary') });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Fees", subtitle: "Collect a payment, print the receipt, and see who still owes." }), summary && (_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4", children: [_jsx(Stat, { label: "Collected today", value: money(summary.today.amount), hint: `${summary.today.count} receipts`, tone: "grass" }), _jsx(Stat, { label: "This month", value: money(summary.month.amount), hint: `${summary.month.count} receipts`, tone: "teal" }), _jsx(Stat, { label: "Cash this month", value: money(summary.byMode?.CASH || 0) }), _jsx(Stat, { label: "Online this month", value: money((summary.byMode?.UPI || 0) + (summary.byMode?.NETBANKING || 0)) })] })), _jsx("div", { className: "flex gap-2 mb-4", children: [['dues', 'Outstanding dues'], ['collect', 'Collect a payment']].map(([k, l]) => (_jsx("button", { onClick: () => setTab(k), className: `px-3 py-1.5 rounded-md text-[13.5px] border ${tab === k ? 'bg-ink text-white border-ink' : 'bg-white border-line text-gray-600 hover:border-teal'}`, children: l }, k))) }), tab === 'dues' ? (_jsx(Dues, { onCollect: (id) => { setStudentId(id); setTab('collect'); } })) : (_jsx(Collect, { studentId: studentId, setStudentId: setStudentId }))] }));
}
function Dues({ onCollect }) {
    const [sectionId, setSectionId] = useState('');
    const { data: sections } = useQuery({ queryKey: ['sections'], queryFn: () => get('/academic/sections') });
    const { data, isLoading } = useQuery({
        queryKey: ['dues', sectionId],
        queryFn: () => get('/fees/dues', { sectionId: sectionId || undefined }),
    });
    if (isLoading)
        return _jsx(Loading, {});
    return (_jsxs(_Fragment, { children: [_jsxs(Select, { value: sectionId, onChange: (e) => setSectionId(e.target.value), className: "max-w-[240px] mb-4", children: [_jsx("option", { value: "", children: "All sections" }), sections?.map((s) => (_jsxs("option", { value: s.id, children: [s.classLevel.name, " ", s.name] }, s.id)))] }), _jsx(Panel, { title: `${data?.count || 0} students owe ${money(data?.totalDue || 0)}`, subtitle: "Longest overdue first", children: !data?.rows.length ? (_jsx(Empty, { title: "No dues outstanding", hint: "Every assigned fee has been collected." })) : (_jsx(Table, { head: ['Student', 'Class', 'Payable', 'Paid', 'Balance', 'Overdue', ''], children: data.rows.map((r) => (_jsxs("tr", { children: [_jsxs(Td, { children: [_jsx(Link, { to: `/students/${r.studentId}`, className: "font-medium text-ink hover:text-teal", children: r.name }), _jsx("div", { className: "text-[12px] text-gray-400 tabular", children: r.admissionNo })] }), _jsx(Td, { children: r.section }), _jsx(Td, { className: "tabular", children: money(r.netPayable) }), _jsx(Td, { className: "tabular text-gray-500", children: money(r.paid) }), _jsx(Td, { className: "tabular font-medium", children: money(r.balance) }), _jsx(Td, { children: _jsx(Badge, { tone: r.ageDays > 60 ? 'absent' : r.ageDays > 0 ? 'pending' : 'muted', children: r.bucket }) }), _jsx(Td, { children: _jsx(Button, { size: "sm", variant: "secondary", onClick: () => onCollect(r.studentId), children: "Collect" }) })] }, r.studentFeeId))) })) })] }));
}
function Collect({ studentId, setStudentId }) {
    const qc = useQueryClient();
    const [q, setQ] = useState('');
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('CASH');
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState(null);
    const { data: students } = useQuery({
        queryKey: ['students', q],
        queryFn: () => get('/students', { q }),
        enabled: q.length > 1,
    });
    const { data: fees } = useQuery({
        queryKey: ['student-fees', studentId],
        queryFn: () => get(`/fees/student/${studentId}`),
        enabled: !!studentId,
    });
    const collect = useMutation({
        mutationFn: (studentFeeId) => post('/fees/collect', { studentFeeId, amount: Number(amount), mode }),
        onSuccess: (res) => {
            setReceipt(res);
            setAmount('');
            setError('');
            qc.invalidateQueries({ queryKey: ['student-fees', studentId] });
            qc.invalidateQueries({ queryKey: ['dues'] });
            qc.invalidateQueries({ queryKey: ['fee-summary'] });
        },
        onError: (e) => setError(errorText(e)),
    });
    return (_jsxs("div", { className: "grid lg:grid-cols-[360px_1fr] gap-4 items-start", children: [_jsx(Panel, { title: "Find the student", children: _jsxs("div", { className: "p-4 space-y-3", children: [_jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Name or admission number" }), students?.slice(0, 8).map((s) => (_jsxs("button", { onClick: () => setStudentId(s.id), className: `block w-full text-left border rounded-md px-3 py-2 text-[13.5px] ${studentId === s.id ? 'border-teal bg-teal-light' : 'border-line hover:border-teal'}`, children: [_jsxs("span", { className: "font-medium", children: [s.firstName, " ", s.lastName] }), _jsx("span", { className: "text-gray-400 tabular ml-2", children: s.admissionNo })] }, s.id)))] }) }), _jsx("div", { className: "space-y-4", children: !studentId ? (_jsx(Panel, { children: _jsx(Empty, { title: "Choose a student", hint: "Search by name or admission number on the left." }) })) : !fees ? (_jsx(Loading, {})) : (_jsxs(_Fragment, { children: [_jsx(Panel, { title: "Fee position", subtitle: `Paid ${money(fees.paid)} of ${money(fees.total)}`, children: fees.rows.map((r) => (_jsxs("div", { className: "px-4 py-3 border-b border-line last:border-0", children: [_jsxs("div", { className: "flex justify-between items-start gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-[14px]", children: r.structure }), _jsx("div", { className: "text-[12.5px] text-gray-500", children: r.heads.map((h) => `${h.name} ${money(h.amount)}`).join(' · ') }), r.concession > 0 && (_jsxs("div", { className: "text-[12.5px] text-teal mt-0.5", children: ["Concession ", money(r.concession)] }))] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "tabular font-semibold", children: money(r.netPayable - r.paid) }), _jsx("div", { className: "text-[12px] text-gray-400", children: "balance" })] })] }), _jsx("div", { className: "mt-3 grid sm:grid-cols-2 gap-2", children: r.installments.map((i) => (_jsxs("div", { className: `border rounded-md px-3 py-2 text-[13px] flex justify-between ${i.isOverdue ? 'border-rose/30 bg-rose-light' : 'border-line'}`, children: [_jsxs("span", { className: "text-gray-600", children: ["Installment ", i.seq, " \u00B7 ", dateIn(i.dueDate)] }), _jsxs("span", { className: "tabular", children: [money(i.paidAmount), " / ", money(i.amount)] })] }, i.seq))) }), r.netPayable - r.paid > 0 && (_jsxs("div", { className: "mt-3 flex flex-wrap items-end gap-3", children: [_jsx(Field, { label: "Amount", children: _jsx(Input, { type: "number", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: String(r.netPayable - r.paid), className: "w-36" }) }), _jsx(Field, { label: "Mode", children: _jsx(Select, { value: mode, onChange: (e) => setMode(e.target.value), className: "w-36", children: ['CASH', 'UPI', 'NETBANKING', 'CHEQUE', 'CARD'].map((m) => (_jsx("option", { value: m, children: m.toLowerCase() }, m))) }) }), _jsx(Button, { onClick: () => collect.mutate(r.id), disabled: !amount || collect.isPending, children: "Collect and issue receipt" })] }))] }, r.id))) }), error && _jsx(ErrorNote, { text: error }), receipt && (_jsx(Panel, { title: "Receipt issued", children: _jsxs("div", { className: "p-4 text-[14px]", children: [_jsxs("div", { className: "flex justify-between border-b border-line pb-2", children: [_jsx("span", { className: "text-gray-500", children: "Receipt number" }), _jsx("span", { className: "tabular font-semibold", children: receipt.receiptNo })] }), _jsxs("div", { className: "flex justify-between pt-2", children: [_jsx("span", { className: "text-gray-500", children: "Amount received" }), _jsx("span", { className: "tabular", children: money(receipt.payment.amount) })] }), _jsxs("div", { className: "flex justify-between pt-1", children: [_jsx("span", { className: "text-gray-500", children: "Balance after payment" }), _jsx("span", { className: "tabular", children: money(receipt.balanceAfter) })] }), _jsx(Button, { variant: "secondary", size: "sm", className: "mt-3", onClick: () => window.print(), children: "Print receipt" })] }) })), fees.rows.some((r) => r.receipts.length) && (_jsx(Panel, { title: "Earlier receipts", children: _jsx(Table, { head: ['Receipt', 'Amount', 'Mode', 'Date'], children: fees.rows.flatMap((r) => r.receipts.map((p) => (_jsxs("tr", { className: p.isCancelled ? 'text-gray-400 line-through' : '', children: [_jsx(Td, { className: "tabular", children: p.receiptNo }), _jsx(Td, { className: "tabular", children: money(p.amount) }), _jsx(Td, { children: p.mode.toLowerCase() }), _jsx(Td, { className: "text-gray-500", children: timeAgo(p.paidAt) })] }, p.id)))) }) }))] })) })] }));
}
