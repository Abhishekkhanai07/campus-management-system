import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Empty, Loading, Panel, Select, PageTitle } from '../components/ui';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export default function Timetable() {
    const user = useAuth((s) => s.user);
    const [sectionId, setSectionId] = useState('');
    const isStaff = ['TEACHER', 'HOD'].includes(user.role);
    const { data: sections } = useQuery({
        queryKey: ['sections'],
        queryFn: () => get('/academic/sections'),
        enabled: !['STUDENT', 'PARENT'].includes(user.role),
    });
    const { data: slots, isLoading } = useQuery({
        queryKey: ['timetable', sectionId, user.staffId],
        queryFn: () => get('/academic/timetable', {
            sectionId: sectionId || undefined,
            staffId: !sectionId && isStaff ? user.staffId : undefined,
        }),
    });
    const periods = Array.from(new Set((slots || []).map((s) => s.periodNo))).sort((a, b) => a - b);
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Timetable", subtitle: sectionId ? 'Class timetable' : isStaff ? 'Your weekly periods' : 'Choose a class', action: sections && (_jsxs(Select, { value: sectionId, onChange: (e) => setSectionId(e.target.value), className: "max-w-[240px]", children: [_jsx("option", { value: "", children: isStaff ? 'My timetable' : 'Choose a class' }), sections.map((s) => (_jsxs("option", { value: s.id, children: [s.classLevel.name, " ", s.name] }, s.id)))] })) }), isLoading ? (_jsx(Loading, {})) : !slots?.length ? (_jsx(Empty, { title: "No timetable yet", hint: "Periods appear here once the timetable is entered." })) : (_jsx(Panel, { children: _jsx("div", { className: "scroll-x", children: _jsxs("table", { className: "w-full text-[13px]", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-line text-gray-500", children: [_jsx("th", { className: "text-left font-medium px-4 py-2.5", children: "Day" }), periods.map((p) => (_jsxs("th", { className: "font-medium px-3 py-2.5 tabular", children: ["Period ", p] }, p)))] }) }), _jsx("tbody", { className: "divide-y divide-line", children: DAYS.map((day, i) => {
                                    const wd = i + 1;
                                    const daySlots = slots.filter((s) => s.weekday === wd);
                                    if (!daySlots.length)
                                        return null;
                                    return (_jsxs("tr", { children: [_jsx("td", { className: "px-4 py-2 font-medium whitespace-nowrap", children: day }), periods.map((p) => {
                                                const slot = daySlots.find((s) => s.periodNo === p);
                                                return (_jsx("td", { className: "px-3 py-2 align-top", children: slot ? (_jsxs("div", { className: "border border-line rounded-md px-2 py-1.5 bg-canvas", children: [_jsx("div", { className: "font-medium text-ink", children: slot.subject.name }), _jsx("div", { className: "text-[12px] text-gray-500", children: sectionId
                                                                    ? `${slot.staff.firstName} ${slot.staff.lastName}`
                                                                    : `${slot.section.classLevel.name} ${slot.section.name}` }), _jsxs("div", { className: "text-[11.5px] text-gray-400 tabular", children: [slot.startTime, "\u2013", slot.endTime] })] })) : (_jsx("span", { className: "text-gray-300", children: "\u2014" })) }, p));
                                            })] }, day));
                                }) })] }) }) }))] }));
}
