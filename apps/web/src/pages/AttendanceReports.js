import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { todayIso } from '../lib/format';
import { Badge, Empty, Loading, Panel, PercentBar, Select, Stat, Table, Td, PageTitle, } from '../components/ui';
export default function AttendanceReports() {
    const [tab, setTab] = useState('defaulters');
    const [sectionId, setSectionId] = useState('');
    const [month, setMonth] = useState(todayIso().slice(0, 7));
    const { data: sections } = useQuery({
        queryKey: ['sections'],
        queryFn: () => get('/academic/sections'),
    });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Attendance reports", subtitle: "Who is short, what the month looks like, what is still unmarked." }), _jsx("div", { className: "flex flex-wrap gap-2 mb-4", children: [
                    ['defaulters', 'Short attendance'],
                    ['register', 'Monthly register'],
                    ['not-marked', 'Periods not marked'],
                ].map(([key, label]) => (_jsx("button", { onClick: () => setTab(key), className: `px-3 py-1.5 rounded-md text-[13.5px] border ${tab === key ? 'bg-ink text-white border-ink' : 'bg-white border-line text-gray-600 hover:border-teal'}`, children: label }, key))) }), tab !== 'not-marked' && (_jsxs("div", { className: "flex flex-wrap gap-3 mb-4", children: [_jsxs(Select, { value: sectionId, onChange: (e) => setSectionId(e.target.value), className: "max-w-[240px]", children: [_jsx("option", { value: "", children: "All sections" }), sections?.map((s) => (_jsxs("option", { value: s.id, children: [s.classLevel.name, " ", s.name] }, s.id)))] }), tab === 'register' && (_jsx("input", { type: "month", value: month, onChange: (e) => setMonth(e.target.value), className: "border border-line rounded-md px-3 py-2 text-[14px] bg-white" }))] })), tab === 'defaulters' && _jsx(Defaulters, { sectionId: sectionId }), tab === 'register' && _jsx(Register, { sectionId: sectionId, month: month }), tab === 'not-marked' && _jsx(NotMarked, {})] }));
}
function Defaulters({ sectionId }) {
    const { data, isLoading } = useQuery({
        queryKey: ['defaulters', sectionId],
        queryFn: () => get('/attendance/report/defaulters', { sectionId: sectionId || undefined }),
    });
    if (isLoading)
        return _jsx(Loading, {});
    if (!data)
        return null;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4", children: [_jsx(Stat, { label: "Students below minimum", value: data.count, tone: data.count ? 'rose' : 'grass' }), _jsx(Stat, { label: "Minimum required", value: `${data.minRequired}%` })] }), _jsx(Panel, { title: "Short attendance", subtitle: "Lowest first. These students may be blocked from exams.", children: data.rows.length === 0 ? (_jsx(Empty, { title: "Nobody is short", hint: "Every student is above the minimum." })) : (_jsx(Table, { head: ['Student', 'Admission no', 'Section', 'Days held', 'Attended', 'Percentage'], children: data.rows.map((r) => (_jsxs("tr", { children: [_jsx(Td, { children: _jsx(Link, { to: `/students/${r.studentId}`, className: "text-ink hover:text-teal font-medium", children: r.name }) }), _jsx(Td, { className: "tabular text-gray-500", children: r.admissionNo }), _jsx(Td, { children: r.section }), _jsx(Td, { className: "tabular", children: r.held }), _jsx(Td, { className: "tabular", children: r.present }), _jsx(Td, { children: _jsx(PercentBar, { value: r.pct, min: data.minRequired }) })] }, r.studentId))) })) })] }));
}
const CODE = {
    PRESENT: { c: 'text-grass', t: 'P' },
    ABSENT: { c: 'text-rose font-semibold', t: 'A' },
    LATE: { c: 'text-amber', t: 'L' },
    ON_LEAVE: { c: 'text-gray-400', t: 'CL' },
    HALF_DAY: { c: 'text-amber', t: 'H' },
    ON_DUTY: { c: 'text-teal', t: 'OD' },
};
function Register({ sectionId, month }) {
    const { data, isLoading } = useQuery({
        queryKey: ['register', sectionId, month],
        queryFn: () => get('/attendance/report/register', { sectionId, month }),
        enabled: !!sectionId,
    });
    if (!sectionId)
        return _jsx(Empty, { title: "Choose a section", hint: "The register is printed one section at a time." });
    if (isLoading)
        return _jsx(Loading, {});
    if (!data)
        return null;
    return (_jsx(Panel, { title: `Register for ${month}`, subtitle: "P present \u00B7 A absent \u00B7 L late \u00B7 CL leave", children: _jsx("div", { className: "scroll-x", children: _jsxs("table", { className: "text-[12.5px]", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-line", children: [_jsx("th", { className: "text-left font-medium text-gray-500 px-3 py-2 sticky left-0 bg-white", children: "Student" }), data.days.map((d) => (_jsx("th", { className: `font-medium px-1.5 py-2 tabular ${data.holidays.includes(d) ? 'text-gray-300' : 'text-gray-500'}`, children: d.slice(8) }, d)))] }) }), _jsx("tbody", { className: "divide-y divide-line", children: data.rows.map((r) => (_jsxs("tr", { children: [_jsxs("td", { className: "px-3 py-1.5 whitespace-nowrap sticky left-0 bg-white", children: [_jsx("span", { className: "tabular text-gray-400 mr-2", children: r.rollNo }), r.name] }), r.marks.map((m, i) => (_jsx("td", { className: `text-center px-1.5 py-1.5 tabular ${m ? CODE[m]?.c : 'text-gray-200'}`, children: m ? CODE[m]?.t : '·' }, i)))] }, r.studentId))) })] }) }) }));
}
function NotMarked() {
    const [date, setDate] = useState(todayIso());
    const { data, isLoading } = useQuery({
        queryKey: ['not-marked', date],
        queryFn: () => get('/attendance/report/not-marked', { date }),
    });
    return (_jsxs(_Fragment, { children: [_jsx("input", { type: "date", value: date, max: todayIso(), onChange: (e) => setDate(e.target.value), className: "border border-line rounded-md px-3 py-2 text-[14px] bg-white mb-4" }), isLoading ? (_jsx(Loading, {})) : (_jsx(Panel, { title: "Periods without attendance", subtitle: data?.rows.length ? 'Follow up with these teachers' : undefined, children: !data?.rows.length ? (_jsx(Empty, { title: "Every period is marked", hint: "Nothing pending for this date." })) : (_jsx(Table, { head: ['Period', 'Section', 'Subject', 'Teacher'], children: data.rows.map((r) => (_jsxs("tr", { children: [_jsxs(Td, { className: "tabular whitespace-nowrap", children: [r.periodNo, " \u00B7 ", r.time] }), _jsx(Td, { children: r.section }), _jsx(Td, { children: r.subject }), _jsxs(Td, { children: [r.teacher, " ", _jsx(Badge, { tone: "pending", children: "not marked" })] })] }, r.slotId))) })) }))] }));
}
