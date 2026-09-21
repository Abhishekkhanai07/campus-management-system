import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { Badge, Empty, Input, Loading, Panel, Stat, Table, Td, PageTitle, } from '../components/ui';
export default function Staff() {
    const [q, setQ] = useState('');
    const [openId, setOpenId] = useState(null);
    const { data, isLoading } = useQuery({
        queryKey: ['staff', q],
        queryFn: () => get('/staff', { q: q || undefined }),
    });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Teachers and staff", subtitle: "Who teaches what, how many students, and which class they own." }), _jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search by name or employee code", className: "max-w-[320px] mb-4" }), _jsx(Panel, { title: data ? `${data.length} staff` : 'Staff', children: isLoading ? (_jsx(Loading, {})) : !data?.length ? (_jsx(Empty, { title: "No staff matched" })) : (_jsx(Table, { head: ['Code', 'Name', 'Designation', 'Department', 'Class teacher of', 'Subjects', 'Periods/week'], children: data.map((s) => (_jsxs("tr", { className: "cursor-pointer hover:bg-canvas", onClick: () => setOpenId(openId === s.id ? null : s.id), children: [_jsx(Td, { className: "tabular text-gray-500", children: s.employeeCode }), _jsxs(Td, { className: "font-medium", children: [s.firstName, " ", s.lastName] }), _jsx(Td, { className: "text-gray-600", children: s.designation || '—' }), _jsx(Td, { children: s.department?.name || '—' }), _jsx(Td, { children: s.classTeacherOf.length
                                    ? s.classTeacherOf.map((c) => `${c.classLevel.name} ${c.name}`).join(', ')
                                    : _jsx("span", { className: "text-gray-400", children: "\u2014" }) }), _jsx(Td, { className: "tabular", children: s._count.allocations }), _jsxs(Td, { className: "tabular", children: [s._count.slots, s._count.slots > s.maxPeriodsPerWeek && _jsx(Badge, { tone: "absent", children: "over limit" })] })] }, s.id))) })) }), openId && _jsx(StaffDetail, { id: openId })] }));
}
function StaffDetail({ id }) {
    const { data, isLoading } = useQuery({ queryKey: ['staff-detail', id], queryFn: () => get(`/staff/${id}`) });
    if (isLoading)
        return _jsx(Loading, {});
    if (!data)
        return null;
    return (_jsxs("div", { className: "mt-4 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children: [_jsx(Stat, { label: "Subjects", value: data.summary.subjectsTaught }), _jsx(Stat, { label: "Sections", value: data.summary.sectionsTaught }), _jsx(Stat, { label: "Students taught", value: data.summary.studentsTaught, tone: "teal" }), _jsx(Stat, { label: "Periods per week", value: `${data.summary.periodsPerWeek} / ${data.summary.maxPeriodsPerWeek}`, tone: data.summary.periodsPerWeek > data.summary.maxPeriodsPerWeek ? 'rose' : 'default' })] }), _jsx(Panel, { title: `${data.firstName} ${data.lastName} teaches`, children: data.allocations.length === 0 ? (_jsx(Empty, { title: "No subjects allotted yet" })) : (_jsx(Table, { head: ['Subject', 'Class', 'Students'], children: data.allocations.map((a) => (_jsxs("tr", { children: [_jsx(Td, { children: a.subject.name }), _jsxs(Td, { children: [a.section.classLevel.name, " ", a.section.name] }), _jsx(Td, { className: "tabular", children: a.section._count.enrollments })] }, a.id))) })) })] }));
}
