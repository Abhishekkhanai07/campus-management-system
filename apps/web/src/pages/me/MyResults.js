import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import { Badge, Empty, Loading, Panel, Stat, Table, Td, PageTitle } from '../../components/ui';
export default function MyResults() {
    const { data, isLoading } = useQuery({ queryKey: ['my-results'], queryFn: () => get('/exams/my-results') });
    if (isLoading)
        return _jsx(Loading, {});
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "My results", subtitle: "Only exams the school has published appear here." }), !data?.length ? (_jsx(Empty, { title: "No results published yet", hint: "Results appear once the school publishes them." })) : (data.map((r) => (_jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3", children: [_jsx(Stat, { label: "Exam", value: _jsx("span", { className: "text-[16px]", children: r.exam }) }), _jsx(Stat, { label: "Percentage", value: `${r.percentage}%`, tone: r.isPass ? 'grass' : 'rose' }), _jsx(Stat, { label: "Grade", value: r.grade }), _jsx(Stat, { label: "Rank in class", value: r.rank, tone: "teal" })] }), _jsx(Panel, { title: "Subject marks", subtitle: `${r.total} out of ${r.maxTotal}`, children: _jsx(Table, { head: ['Subject', 'Marks', 'Result'], children: r.subjects.map((s) => (_jsxs("tr", { children: [_jsx(Td, { children: s.subject }), _jsxs(Td, { className: "tabular", children: [s.marks ?? '—', " / ", s.maxMarks] }), _jsx(Td, { children: _jsx(Badge, { tone: s.isPass ? 'present' : 'absent', children: s.isPass ? 'pass' : 'fail' }) })] }, s.subject))) }) })] }, r.examId))))] }));
}
