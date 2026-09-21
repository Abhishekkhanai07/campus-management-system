import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post, errorText } from '../lib/api';
import { dateIn } from '../lib/format';
import { Badge, Button, Empty, ErrorNote, Input, Loading, Panel, Stat, Table, Td, PageTitle, statusTone, } from '../components/ui';
export default function AssignmentDetail() {
    const { id } = useParams();
    const qc = useQueryClient();
    const [error, setError] = useState('');
    const [marks, setMarks] = useState({});
    const { data, isLoading } = useQuery({
        queryKey: ['assignment', id],
        queryFn: () => get(`/assignments/${id}`),
    });
    const evaluate = useMutation({
        mutationFn: ({ submissionId, value }) => patch(`/assignments/submissions/${submissionId}/evaluate`, { marks: value }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['assignment', id] }),
        onError: (e) => setError(errorText(e)),
    });
    const markOffline = useMutation({
        mutationFn: (studentId) => post(`/assignments/${id}/offline-submission`, { studentId }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['assignment', id] }),
        onError: (e) => setError(errorText(e)),
    });
    if (isLoading)
        return _jsx(Loading, {});
    if (!data)
        return _jsx(Empty, { title: "Assignment not found" });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: data.title, subtitle: `${data.section} · ${data.subject} · due ${dateIn(data.dueDate)}`, action: _jsx(Link, { to: "/assignments", className: "text-[13.5px] text-teal", children: "Back to assignments" }) }), _jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4", children: [_jsx(Stat, { label: "Submitted", value: `${data.stats.submitted} / ${data.stats.total}`, tone: "grass" }), _jsx(Stat, { label: "Not submitted", value: data.stats.pending, tone: data.stats.pending ? 'rose' : 'default' }), _jsx(Stat, { label: "Late", value: data.stats.late, tone: data.stats.late ? 'amber' : 'default' }), _jsx(Stat, { label: "Evaluated", value: data.stats.evaluated })] }), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), _jsx(Panel, { title: "Class list", subtitle: "Tick off paper submissions and enter marks here.", children: _jsx(Table, { head: ['Student', 'Admission no', 'Status', 'Submitted on', 'Marks', ''], children: data.submissions.map((s) => (_jsxs("tr", { className: s.status === 'PENDING' ? 'bg-rose-light/40' : '', children: [_jsx(Td, { className: "font-medium", children: s.name }), _jsx(Td, { className: "tabular text-gray-500", children: s.admissionNo }), _jsxs(Td, { children: [_jsx(Badge, { tone: statusTone(s.status), children: s.status.toLowerCase() }), s.isLate && _jsx("span", { className: "text-[12px] text-amber ml-1", children: "late" })] }), _jsx(Td, { className: "tabular text-gray-500", children: s.submittedAt ? dateIn(s.submittedAt) : '—' }), _jsx(Td, { children: s.status === 'PENDING' ? (_jsx("span", { className: "text-gray-400", children: "\u2014" })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { type: "number", className: "w-20", defaultValue: s.marks ?? '', max: data.maxMarks, onChange: (e) => setMarks({ ...marks, [s.id]: e.target.value }) }), _jsxs("span", { className: "text-gray-400 text-[13px]", children: ["/ ", data.maxMarks] })] })) }), _jsx(Td, { children: s.status === 'PENDING' ? (_jsx(Button, { size: "sm", variant: "secondary", onClick: () => markOffline.mutate(s.studentId), children: "Received on paper" })) : (_jsx(Button, { size: "sm", disabled: marks[s.id] === undefined, onClick: () => evaluate.mutate({ submissionId: s.id, value: Number(marks[s.id]) }), children: "Save marks" })) })] }, s.id))) }) })] }));
}
