import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Empty, Input, Loading, Panel, Select, Stat, Table, Td, PageTitle, } from '../components/ui';
export default function Students() {
    const user = useAuth((s) => s.user);
    const [q, setQ] = useState('');
    const [sectionId, setSectionId] = useState('');
    const canSeeAll = ['SUPER_ADMIN', 'ADMIN', 'OFFICE', 'ACCOUNTANT'].includes(user.role);
    const { data: sections } = useQuery({
        queryKey: ['sections'],
        queryFn: () => get('/academic/sections'),
        enabled: canSeeAll,
    });
    const { data: strength } = useQuery({
        queryKey: ['strength'],
        queryFn: () => get('/students/strength'),
        enabled: canSeeAll,
    });
    const { data: students, isLoading } = useQuery({
        queryKey: ['students', q, sectionId],
        queryFn: () => get('/students', { q: q || undefined, sectionId: sectionId || undefined }),
    });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Students", subtitle: "Open a student to see attendance, assignments, marks and fees together." }), strength && (_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4", children: [_jsx(Stat, { label: "On roll", value: strength.totals.students }), _jsx(Stat, { label: "Sanctioned seats", value: strength.totals.capacity }), _jsx(Stat, { label: "Sections", value: strength.totals.sections }), _jsx(Stat, { label: "Vacant seats", value: strength.totals.capacity - strength.totals.students, tone: "teal" })] })), _jsxs("div", { className: "flex flex-wrap gap-3 mb-4", children: [_jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search by name or admission number", className: "max-w-[320px]" }), canSeeAll && (_jsxs(Select, { value: sectionId, onChange: (e) => setSectionId(e.target.value), className: "max-w-[220px]", children: [_jsx("option", { value: "", children: "All sections" }), sections?.map((s) => (_jsxs("option", { value: s.id, children: [s.classLevel.name, " ", s.name] }, s.id)))] }))] }), strength && !sectionId && !q && (_jsx(Panel, { title: "Class strength", className: "mb-4", children: _jsx(Table, { head: ['Class', 'Class teacher', 'Strength', 'Capacity', 'Vacant', 'Boys', 'Girls'], children: strength.rows.map((r) => (_jsxs("tr", { children: [_jsxs(Td, { className: "font-medium", children: [r.class, " ", r.section] }), _jsx(Td, { className: r.classTeacher ? '' : 'text-rose', children: r.classTeacher || 'not assigned' }), _jsx(Td, { className: "tabular", children: r.strength }), _jsx(Td, { className: "tabular text-gray-500", children: r.capacity }), _jsx(Td, { className: "tabular", children: r.isFull ? _jsx(Badge, { tone: "absent", children: "full" }) : r.vacant }), _jsx(Td, { className: "tabular", children: r.male }), _jsx(Td, { className: "tabular", children: r.female })] }, r.sectionId))) }) })), _jsx(Panel, { title: students ? `${students.length} students` : 'Students', children: isLoading ? (_jsx(Loading, {})) : !students?.length ? (_jsx(Empty, { title: "No students matched", hint: "Try a different name or clear the filters." })) : (_jsx(Table, { head: ['Admission no', 'Name', 'Class', 'Roll', 'Guardian', 'Phone'], children: students.map((s) => {
                        const e = s.enrollments?.[0];
                        return (_jsxs("tr", { children: [_jsx(Td, { className: "tabular text-gray-500", children: s.admissionNo }), _jsx(Td, { children: _jsxs(Link, { to: `/students/${s.id}`, className: "font-medium text-ink hover:text-teal", children: [s.firstName, " ", s.lastName] }) }), _jsx(Td, { children: e ? `${e.section.classLevel.name} ${e.section.name}` : '—' }), _jsx(Td, { className: "tabular", children: e?.rollNo ?? '—' }), _jsx(Td, { className: "text-gray-600", children: s.guardians?.[0]?.name || '—' }), _jsx(Td, { className: "tabular text-gray-600", children: s.phone || '—' })] }, s.id));
                    }) })) })] }));
}
