import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Select, PageTitle, } from '../components/ui';
export default function Notices() {
    const user = useAuth((s) => s.user);
    const qc = useQueryClient();
    const [error, setError] = useState('');
    const [form, setForm] = useState({ title: '', body: '', audience: 'ALL' });
    const canPost = ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE'].includes(user.role);
    const { data, isLoading } = useQuery({ queryKey: ['notices'], queryFn: () => get('/notices') });
    const create = useMutation({
        mutationFn: () => post('/notices', form),
        onSuccess: () => {
            setForm({ title: '', body: '', audience: 'ALL' });
            qc.invalidateQueries({ queryKey: ['notices'] });
        },
        onError: (e) => setError(errorText(e)),
    });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Notices", subtitle: "Announcements for staff, students and parents." }), canPost && (_jsx(Panel, { title: "Post a notice", className: "mb-4", children: _jsxs("form", { className: "p-4 grid gap-3 sm:grid-cols-2", onSubmit: (e) => { e.preventDefault(); create.mutate(); }, children: [_jsx(Field, { label: "Title", children: _jsx(Input, { value: form.title, onChange: (e) => setForm({ ...form, title: e.target.value }), required: true }) }), _jsx(Field, { label: "Who should see it", children: _jsxs(Select, { value: form.audience, onChange: (e) => setForm({ ...form, audience: e.target.value }), children: [_jsx("option", { value: "ALL", children: "Everyone" }), _jsx("option", { value: "STAFF", children: "Staff only" }), _jsx("option", { value: "STUDENTS", children: "Students" }), _jsx("option", { value: "PARENTS", children: "Parents" })] }) }), _jsx(Field, { label: "Message", children: _jsx(Input, { value: form.body, onChange: (e) => setForm({ ...form, body: e.target.value }), required: true }) }), _jsxs("div", { className: "sm:col-span-2 flex items-center gap-3", children: [_jsx(Button, { type: "submit", disabled: create.isPending, children: "Publish" }), error && _jsx(ErrorNote, { text: error })] })] }) })), isLoading ? (_jsx(Loading, {})) : !data?.length ? (_jsx(Empty, { title: "No notices yet" })) : (_jsx("div", { className: "space-y-3", children: data.map((n) => (_jsx(Panel, { children: _jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("h3", { className: "text-[15px] font-semibold text-ink", children: n.title }), _jsx(Badge, { tone: "info", children: n.audience.toLowerCase() })] }), _jsx("p", { className: "text-[13.5px] text-gray-600 mt-1.5 leading-relaxed", children: n.body }), _jsx("p", { className: "text-[12px] text-gray-400 mt-2", children: timeAgo(n.createdAt) })] }) }, n.id))) }))] }));
}
