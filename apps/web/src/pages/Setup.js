import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, errorText } from '../lib/api';
import { dateIn } from '../lib/format';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Table, Td, PageTitle, } from '../components/ui';
export default function Setup() {
    const qc = useQueryClient();
    const [error, setError] = useState('');
    const { data: inst, isLoading } = useQuery({ queryKey: ['institute'], queryFn: () => get('/academic/institute') });
    const { data: years } = useQuery({ queryKey: ['years'], queryFn: () => get('/academic/years') });
    const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => get('/academic/classes') });
    const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: () => get('/academic/subjects') });
    const saveRules = useMutation({
        mutationFn: (body) => patch('/academic/institute', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['institute'] }),
        onError: (e) => setError(errorText(e)),
    });
    const activateYear = useMutation({
        mutationFn: (id) => patch(`/academic/years/${id}/activate`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['years'] }),
    });
    if (isLoading)
        return _jsx(Loading, {});
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Setup", subtitle: "Rules the whole system follows. Change them here, not in the code." }), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), _jsxs("div", { className: "grid lg:grid-cols-2 gap-4", children: [_jsx(Panel, { title: "Institute", children: _jsxs("div", { className: "p-4 space-y-2 text-[14px]", children: [_jsx(Row, { label: "Name", value: inst?.name }), _jsx(Row, { label: "Board", value: inst?.board }), _jsx(Row, { label: "Code", value: inst?.code }), _jsx(Row, { label: "Address", value: inst?.address }), _jsx(Row, { label: "Phone", value: inst?.phone })] }) }), _jsx(Panel, { title: "Rules", children: _jsxs("form", { className: "p-4 space-y-3", onSubmit: (e) => {
                                e.preventDefault();
                                const f = new FormData(e.target);
                                saveRules.mutate({
                                    minAttendancePct: Number(f.get('minAttendancePct')),
                                    attendanceEditWindowHrs: Number(f.get('attendanceEditWindowHrs')),
                                    leaveCountsAsPresent: f.get('leaveCountsAsPresent') === 'on',
                                    allowLateSubmission: f.get('allowLateSubmission') === 'on',
                                });
                            }, children: [_jsx(Field, { label: "Minimum attendance to appear for exams (%)", children: _jsx(Input, { name: "minAttendancePct", type: "number", defaultValue: inst?.minAttendancePct }) }), _jsx(Field, { label: "Hours a teacher may edit attendance after marking", hint: "After this, a correction has to be approved.", children: _jsx(Input, { name: "attendanceEditWindowHrs", type: "number", defaultValue: inst?.attendanceEditWindowHrs }) }), _jsxs("label", { className: "flex items-center gap-2 text-[13.5px]", children: [_jsx("input", { type: "checkbox", name: "leaveCountsAsPresent", defaultChecked: inst?.leaveCountsAsPresent }), "Approved leave counts as present in the percentage"] }), _jsxs("label", { className: "flex items-center gap-2 text-[13.5px]", children: [_jsx("input", { type: "checkbox", name: "allowLateSubmission", defaultChecked: inst?.allowLateSubmission }), "Allow assignment submission after the due date"] }), _jsx(Button, { type: "submit", disabled: saveRules.isPending, children: "Save rules" })] }) }), _jsx(Panel, { title: "Academic years", children: _jsx(Table, { head: ['Year', 'From', 'To', ''], children: years?.map((y) => (_jsxs("tr", { children: [_jsx(Td, { className: "font-medium", children: y.name }), _jsx(Td, { className: "tabular", children: dateIn(y.startDate) }), _jsx(Td, { className: "tabular", children: dateIn(y.endDate) }), _jsx(Td, { children: y.isActive ? (_jsx(Badge, { tone: "present", children: "active" })) : (_jsx(Button, { size: "sm", variant: "secondary", onClick: () => activateYear.mutate(y.id), children: "Make active" })) })] }, y.id))) }) }), _jsxs(Panel, { title: "Classes and subjects", children: [!classes?.length ? (_jsx(Empty, { title: "No classes yet" })) : (_jsx(Table, { head: ['Class', 'Sections', 'Subjects'], children: classes.map((c) => (_jsxs("tr", { children: [_jsx(Td, { className: "font-medium", children: c.name }), _jsx(Td, { children: c.sections.map((s) => s.name).join(', ') || '—' }), _jsx(Td, { className: "text-gray-600", children: c.classSubjects.length })] }, c.id))) })), _jsxs("div", { className: "px-4 py-3 border-t border-line text-[13px] text-gray-500", children: [subjects?.length || 0, " subjects defined"] })] })] })] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { className: "flex justify-between gap-4 border-b border-line last:border-0 pb-2", children: [_jsx("span", { className: "text-gray-500", children: label }), _jsx("span", { className: "text-right", children: value || '—' })] }));
}
