import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dateIn, todayIso } from '../lib/format';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Select, Table, Td, PageTitle, statusTone, } from '../components/ui';
export default function Assignments() {
    const user = useAuth((s) => s.user);
    if (['STUDENT', 'PARENT'].includes(user.role))
        return _jsx(StudentAssignments, {});
    return _jsx(TeacherAssignments, {});
}
/* ---------------------------------------------------------------- teacher */
function TeacherAssignments() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '', description: '', subjectId: '', sectionId: '', dueDate: todayIso(), maxMarks: 10,
    });
    const { data: teaching } = useQuery({ queryKey: ['my-teaching'], queryFn: () => get('/staff/me/teaching') });
    const { data, isLoading } = useQuery({ queryKey: ['assignments'], queryFn: () => get('/assignments') });
    const create = useMutation({
        mutationFn: () => post('/assignments', { ...form, maxMarks: Number(form.maxMarks) }),
        onSuccess: () => {
            setShowForm(false);
            setError('');
            qc.invalidateQueries({ queryKey: ['assignments'] });
        },
        onError: (e) => setError(errorText(e)),
    });
    const allocations = teaching?.allocations || [];
    const sections = Array.from(new Map(allocations.map((a) => [a.sectionId, a.section])).entries());
    const subjectsForSection = allocations.filter((a) => a.sectionId === form.sectionId);
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Assignments", subtitle: "Every assignment shows who has submitted and who has not.", action: _jsx(Button, { onClick: () => setShowForm((v) => !v), children: showForm ? 'Close' : 'New assignment' }) }), showForm && (_jsx(Panel, { title: "New assignment", className: "mb-4", children: _jsxs("form", { className: "p-4 grid gap-3 sm:grid-cols-2", onSubmit: (e) => { e.preventDefault(); create.mutate(); }, children: [_jsx(Field, { label: "Class", children: _jsxs(Select, { value: form.sectionId, onChange: (e) => setForm({ ...form, sectionId: e.target.value, subjectId: '' }), required: true, children: [_jsx("option", { value: "", children: "Choose" }), sections.map(([id, label]) => (_jsx("option", { value: id, children: label }, id)))] }) }), _jsx(Field, { label: "Subject", children: _jsxs(Select, { value: form.subjectId, onChange: (e) => setForm({ ...form, subjectId: e.target.value }), required: true, children: [_jsx("option", { value: "", children: "Choose" }), subjectsForSection.map((a) => (_jsx("option", { value: a.subjectId, children: a.subject }, a.subjectId)))] }) }), _jsx(Field, { label: "Title", children: _jsx(Input, { value: form.title, onChange: (e) => setForm({ ...form, title: e.target.value }), required: true }) }), _jsx(Field, { label: "Due date", children: _jsx(Input, { type: "date", value: form.dueDate, onChange: (e) => setForm({ ...form, dueDate: e.target.value }), required: true }) }), _jsx(Field, { label: "What students should do", children: _jsx(Input, { value: form.description, onChange: (e) => setForm({ ...form, description: e.target.value }) }) }), _jsx(Field, { label: "Maximum marks", children: _jsx(Input, { type: "number", value: form.maxMarks, onChange: (e) => setForm({ ...form, maxMarks: Number(e.target.value) }) }) }), _jsxs("div", { className: "sm:col-span-2 flex items-center gap-3", children: [_jsx(Button, { type: "submit", disabled: create.isPending, children: create.isPending ? 'Creating…' : 'Create and notify the class' }), error && _jsx(ErrorNote, { text: error })] })] }) })), _jsx(Panel, { title: "All assignments", children: isLoading ? (_jsx(Loading, {})) : !data?.length ? (_jsx(Empty, { title: "No assignments yet", hint: "Create one and every student in the section gets it." })) : (_jsx(Table, { head: ['Title', 'Class', 'Subject', 'Due', 'Submitted', 'To evaluate', ''], children: data.map((a) => (_jsxs("tr", { children: [_jsx(Td, { className: "font-medium", children: a.title }), _jsx(Td, { children: a.section }), _jsx(Td, { children: a.subject }), _jsxs(Td, { className: "tabular", children: [dateIn(a.dueDate), " ", a.isOverdue && _jsx(Badge, { tone: "absent", children: "closed" })] }), _jsxs(Td, { className: "tabular", children: [a.submitted, " / ", a.total, a.pending > 0 && _jsxs("span", { className: "text-rose ml-1", children: ["(", a.pending, " not submitted)"] })] }), _jsx(Td, { className: "tabular", children: a.submitted - a.evaluated }), _jsx(Td, { children: _jsx(Link, { to: `/assignments/${a.id}`, children: _jsx(Button, { size: "sm", variant: "secondary", children: "Open" }) }) })] }, a.id))) })) })] }));
}
/* ---------------------------------------------------------------- student */
function StudentAssignments() {
    const qc = useQueryClient();
    const user = useAuth((s) => s.user);
    const [error, setError] = useState('');
    const { data, isLoading } = useQuery({ queryKey: ['assignments'], queryFn: () => get('/assignments') });
    const submit = useMutation({
        mutationFn: (id) => post(`/assignments/${id}/submit`, { content: 'Submitted from the portal' }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
        onError: (e) => setError(errorText(e)),
    });
    if (isLoading)
        return _jsx(Loading, {});
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Assignments", subtitle: "What is due, what you have submitted, and what was marked." }), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), _jsx(Panel, { children: !data?.length ? (_jsx(Empty, { title: "Nothing assigned yet" })) : (_jsx(Table, { head: ['Assignment', 'Subject', 'Teacher', 'Due', 'Status', 'Marks', ''], children: data.map((a) => (_jsxs("tr", { children: [_jsx(Td, { className: "font-medium", children: a.title }), _jsx(Td, { children: a.subject }), _jsx(Td, { className: "text-gray-600", children: a.teacher }), _jsx(Td, { className: "tabular", children: dateIn(a.dueDate) }), _jsx(Td, { children: _jsx(Badge, { tone: statusTone(a.status), children: a.status.toLowerCase() }) }), _jsx(Td, { className: "tabular", children: a.marks != null ? `${a.marks}/${a.maxMarks}` : '—' }), _jsx(Td, { children: a.status === 'PENDING' && user.role === 'STUDENT' && (_jsx(Button, { size: "sm", onClick: () => submit.mutate(a.id), disabled: submit.isPending, children: "Mark as submitted" })) })] }, a.submissionId))) })) })] }));
}
