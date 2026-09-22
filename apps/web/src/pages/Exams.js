import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, PercentBar, Stat, Table, Td, PageTitle, statusTone, } from '../components/ui';
export default function Exams() {
    const user = useAuth((s) => s.user);
    const qc = useQueryClient();
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const { data: exams, isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => get('/exams') });
    const create = useMutation({
        mutationFn: () => post('/exams', { name, type: 'UNIT_TEST' }),
        onSuccess: () => { setName(''); qc.invalidateQueries({ queryKey: ['exams'] }); },
        onError: (e) => setError(errorText(e)),
    });
    const process = useMutation({
        mutationFn: (id) => post(`/exams/${id}/process`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
        onError: (e) => setError(errorText(e)),
    });
    const publish = useMutation({
        mutationFn: (id) => post(`/exams/${id}/publish`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
        onError: (e) => setError(errorText(e)),
    });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Exams and results", subtitle: "Teachers enter marks. Results stay hidden from students until they are published." }), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), isAdmin && (_jsx(Panel, { title: "New exam", className: "mb-4", children: _jsxs("form", { className: "p-4 flex flex-wrap items-end gap-3", onSubmit: (e) => { e.preventDefault(); create.mutate(); }, children: [_jsx(Field, { label: "Exam name", children: _jsx(Input, { value: name, onChange: (e) => setName(e.target.value), placeholder: "Second Unit Test", required: true }) }), _jsx(Button, { type: "submit", disabled: create.isPending, children: "Create" })] }) })), _jsx(Panel, { title: "Exams", children: isLoading ? (_jsx(Loading, {})) : !exams?.length ? (_jsx(Empty, { title: "No exams created yet" })) : (_jsx(Table, { head: ['Exam', 'Type', 'Status', 'Marks entered', ''], children: exams.map((e) => (_jsxs("tr", { children: [_jsx(Td, { className: "font-medium", children: e.name }), _jsx(Td, { className: "text-gray-600", children: e.type.replace('_', ' ').toLowerCase() }), _jsx(Td, { children: _jsx(Badge, { tone: statusTone(e.status), children: e.status.replace('_', ' ').toLowerCase() }) }), _jsx(Td, { className: "tabular", children: e._count.marks }), _jsx(Td, { children: _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Link, { to: `/exams/${e.id}/marks`, children: _jsx(Button, { size: "sm", variant: "secondary", children: "Enter marks" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setSelected(selected === e.id ? null : e.id), children: "Analysis" }), isAdmin && ['MARKS_ENTRY', 'LOCKED', 'PUBLISHED'].includes(e.status) && (_jsx(Button, { size: "sm", onClick: () => process.mutate(e.id), children: e.status === 'MARKS_ENTRY' ? 'Process results' : 'Reprocess results' })), isAdmin && e.status === 'LOCKED' && (_jsx(Button, { size: "sm", onClick: () => publish.mutate(e.id), children: "Publish to students" }))] }) })] }, e.id))) })) }), selected && _jsx(Analysis, { examId: selected })] }));
}
function Analysis({ examId }) {
    const { data, isLoading } = useQuery({
        queryKey: ['exam-analysis', examId],
        queryFn: () => get(`/exams/${examId}/analysis`),
    });
    if (isLoading)
        return _jsx(Loading, {});
    if (!data || data.appeared === 0)
        return _jsx(Panel, { className: "mt-4", children: _jsx(Empty, { title: "Results are not processed yet" }) });
    return (_jsxs("div", { className: "mt-4 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children: [_jsx(Stat, { label: "Appeared", value: data.appeared }), _jsx(Stat, { label: "Passed", value: `${data.passPct}%`, tone: data.passPct >= 80 ? 'grass' : 'amber' }), _jsx(Stat, { label: "Class average", value: `${data.average}%` }), _jsx(Stat, { label: "Did not pass", value: data.failures.length, tone: data.failures.length ? 'rose' : 'grass' })] }), _jsxs("div", { className: "grid lg:grid-cols-2 gap-4", children: [_jsx(Panel, { title: "Subject-wise", children: _jsx(Table, { head: ['Subject', 'Appeared', 'Average', 'Pass rate'], children: data.subjectWise.map((s) => (_jsxs("tr", { children: [_jsx(Td, { children: s.subject }), _jsx(Td, { className: "tabular", children: s.appeared }), _jsxs(Td, { className: "tabular", children: [s.average, " / ", s.maxMarks] }), _jsx(Td, { children: _jsx(PercentBar, { value: s.passPct, min: 80 }) })] }, s.subject))) }) }), _jsx(Panel, { title: "Toppers", children: _jsx(Table, { head: ['Rank', 'Student', 'Class', 'Percentage', 'Grade'], children: data.toppers.map((t) => (_jsxs("tr", { children: [_jsx(Td, { className: "tabular", children: t.rank }), _jsx(Td, { className: "font-medium", children: t.name }), _jsx(Td, { children: t.section }), _jsxs(Td, { className: "tabular", children: [t.percentage, "%"] }), _jsx(Td, { children: _jsx(Badge, { tone: "present", children: t.grade }) })] }, t.rank))) }) })] })] }));
}
