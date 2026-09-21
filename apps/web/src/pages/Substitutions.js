import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { todayIso } from '../lib/format';
import { Badge, Button, Empty, ErrorNote, Loading, Panel, Stat, Table, Td, PageTitle, } from '../components/ui';
export default function Substitutions() {
    const user = useAuth((s) => s.user);
    const qc = useQueryClient();
    const [date, setDate] = useState(todayIso());
    const [picking, setPicking] = useState(null);
    const [error, setError] = useState('');
    const canAssign = ['SUPER_ADMIN', 'ADMIN', 'HOD'].includes(user.role);
    const { data, isLoading } = useQuery({
        queryKey: ['sub-board', date],
        queryFn: () => get('/leaves/substitutions/board', { date }),
    });
    const assign = useMutation({
        mutationFn: ({ id, staffId }) => patch(`/leaves/substitutions/${id}`, { substituteStaffId: staffId, status: 'ASSIGNED' }),
        onSuccess: () => {
            setPicking(null);
            setError('');
            qc.invalidateQueries({ queryKey: ['sub-board'] });
        },
        onError: (e) => setError(errorText(e)),
    });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Teacher cover", subtitle: "Periods left uncovered when a teacher is on leave, and who is taking them.", action: _jsx("input", { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "border border-line rounded-md px-3 py-2 text-[14px] bg-white" }) }), isLoading && _jsx(Loading, {}), data && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-3 gap-3 mb-4", children: [_jsx(Stat, { label: "Periods affected", value: data.summary.total }), _jsx(Stat, { label: "Covered", value: data.summary.covered, tone: "grass" }), _jsx(Stat, { label: "Still open", value: data.summary.needsCover, tone: data.summary.needsCover ? 'rose' : 'grass' })] }), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), _jsx(Panel, { title: `Cover for ${data.date}`, children: data.rows.length === 0 ? (_jsx(Empty, { title: "No cover needed", hint: "No approved teacher leave falls on this date." })) : (_jsx(Table, { head: ['Period', 'Class', 'Subject', 'Teacher on leave', 'Cover', canAssign ? '' : 'Status'], children: data.rows.map((r) => (_jsxs(Fragment, { children: [_jsxs("tr", { children: [_jsxs(Td, { className: "tabular whitespace-nowrap", children: [r.periodNo, " \u00B7 ", r.time] }), _jsxs(Td, { children: [r.section, _jsxs("span", { className: "text-gray-400 text-[12px] ml-1", children: ["(", r.students, ")"] })] }), _jsx(Td, { children: r.subject }), _jsx(Td, { className: "text-gray-600", children: r.absentTeacher }), _jsx(Td, { children: r.substitute ? (_jsx("span", { className: "font-medium text-ink", children: r.substitute })) : (_jsx(Badge, { tone: "absent", children: "Not covered" })) }), _jsx(Td, { children: canAssign ? (_jsx(Button, { size: "sm", variant: r.substitute ? 'secondary' : 'primary', onClick: () => setPicking(picking === r.id ? null : r.id), children: r.substitute ? 'Change' : 'Find cover' })) : (_jsx(Badge, { tone: r.substitute ? 'present' : 'pending', children: r.status.replace('_', ' ') })) })] }), picking === r.id && (_jsx("tr", { children: _jsx(Td, { colSpan: 6, className: "bg-canvas", children: _jsx(Suggestions, { substitutionId: r.id, onPick: (staffId) => assign.mutate({ id: r.id, staffId }), busy: assign.isPending }) }) }))] }, r.id))) })) })] }))] }));
}
function Suggestions({ substitutionId, onPick, busy, }) {
    const { data, isLoading } = useQuery({
        queryKey: ['sub-suggestions', substitutionId],
        queryFn: () => get(`/leaves/substitutions/${substitutionId}/suggestions`),
    });
    if (isLoading)
        return _jsx(Loading, { label: "Finding free teachers" });
    if (!data?.candidates?.length)
        return (_jsx(Empty, { title: "No teacher is free this period", hint: "Consider combining the class with another section, or marking the period as a library period." }));
    return (_jsxs("div", { className: "py-2", children: [_jsx("p", { className: "text-[12.5px] text-gray-500 mb-2", children: "Free this period, best match first. A teacher who already teaches the subject is ranked highest." }), _jsx("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3", children: data.candidates.map((c) => (_jsxs("button", { disabled: busy, onClick: () => onPick(c.staffId), className: "text-left border border-line bg-white rounded-md px-3 py-2 hover:border-teal disabled:opacity-60", children: [_jsx("div", { className: "text-[13.5px] font-medium text-ink", children: c.name }), _jsx("div", { className: "text-[12px] text-gray-500", children: c.reason }), _jsxs("div", { className: "text-[11.5px] text-gray-400 mt-0.5 tabular", children: [c.substitutionsLast7Days, " cover periods in the last 7 days"] })] }, c.staffId))) })] }));
}
