import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import { Empty, Loading, Panel, PercentBar, Stat, Table, Td, PageTitle, } from '../../components/ui';
export default function MyAttendance() {
    const { data, isLoading } = useQuery({ queryKey: ['my-attendance'], queryFn: () => get('/attendance/me') });
    if (isLoading)
        return _jsx(Loading, {});
    if (!data)
        return _jsx(Empty, { title: "No attendance recorded yet" });
    const short = data.overallPct < data.minRequired;
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "My attendance", subtitle: "Day register and subject-wise record." }), _jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children: [_jsx(Stat, { label: "Overall", value: `${data.overallPct}%`, tone: short ? 'rose' : 'grass', hint: `minimum ${data.minRequired}%` }), _jsx(Stat, { label: "Days held", value: data.totalDays }), _jsx(Stat, { label: "Present", value: data.presentDays, tone: "grass" }), _jsx(Stat, { label: "Absent", value: data.absentDays, tone: data.absentDays ? 'rose' : 'default' })] }), short && (_jsxs("div", { className: "mt-4 border border-rose/25 bg-rose-light text-rose rounded-md px-4 py-3 text-[13.5px]", children: ["You are below the ", data.minRequired, "% attendance needed to appear for exams. Speak to your class teacher."] })), _jsxs("div", { className: "grid lg:grid-cols-2 gap-4 mt-4", children: [_jsx(Panel, { title: "Subject-wise", children: !data.bySubject.length ? (_jsx(Empty, { title: "No period attendance recorded" })) : (_jsx(Table, { head: ['Subject', 'Held', 'Attended', 'Percentage'], children: data.bySubject.map((s) => (_jsxs("tr", { children: [_jsx(Td, { children: s.subject }), _jsx(Td, { className: "tabular", children: s.held }), _jsx(Td, { className: "tabular", children: s.present }), _jsx(Td, { children: _jsx(PercentBar, { value: s.pct, min: data.minRequired }) })] }, s.subject))) })) }), _jsx(Panel, { title: "Day by day", children: _jsx("div", { className: "p-4 flex flex-wrap gap-1", children: data.calendar.slice(0, 90).map((d) => (_jsx("span", { title: `${d.date} · ${d.status.toLowerCase()}`, className: `w-5 h-5 rounded-sm ${d.status === 'ABSENT' ? 'bg-rose'
                                    : d.status === 'ON_LEAVE' ? 'bg-gray-300'
                                        : d.status === 'LATE' ? 'bg-amber'
                                            : 'bg-grass'}` }, d.date))) }) })] })] }));
}
