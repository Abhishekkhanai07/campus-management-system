import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dateIn, todayIso } from '../lib/format';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Note, Panel, Select, Table, Td, PageTitle, statusTone, } from '../components/ui';
export default function Leave() {
    const user = useAuth((s) => s.user);
    const isApprover = ['SUPER_ADMIN', 'ADMIN', 'HOD'].includes(user.role);
    const [tab, setTab] = useState(isApprover ? 'approvals' : 'mine');
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Leave", subtitle: "Applying for leave shows the approver exactly which periods will be left uncovered." }), isApprover && (_jsx("div", { className: "flex gap-2 mb-4", children: [['approvals', 'For approval'], ['mine', 'My leave']].map(([k, l]) => (_jsx("button", { onClick: () => setTab(k), className: `px-3 py-1.5 rounded-md text-[13.5px] border ${tab === k ? 'bg-ink text-white border-ink' : 'bg-white border-line text-gray-600 hover:border-teal'}`, children: l }, k))) })), tab === 'approvals' ? _jsx(Approvals, {}) : _jsx(MyLeave, {})] }));
}
/* ---------------------------------------------------------------- apply */
function MyLeave() {
    const qc = useQueryClient();
    const [error, setError] = useState('');
    const [impact, setImpact] = useState(null);
    const [form, setForm] = useState({
        leaveTypeId: '',
        fromDate: todayIso(),
        toDate: todayIso(),
        reason: '',
    });
    const { data: types } = useQuery({ queryKey: ['leave-types'], queryFn: () => get('/leaves/types') });
    const { data: balances } = useQuery({ queryKey: ['leave-balances'], queryFn: () => get('/leaves/balances') });
    const { data: mine, isLoading } = useQuery({ queryKey: ['my-leaves'], queryFn: () => get('/leaves/mine') });
    const apply = useMutation({
        mutationFn: () => post('/leaves', form),
        onSuccess: (res) => {
            setImpact(res.impact);
            setError('');
            setForm((f) => ({ ...f, reason: '' }));
            qc.invalidateQueries({ queryKey: ['my-leaves'] });
            qc.invalidateQueries({ queryKey: ['leave-balances'] });
        },
        onError: (e) => setError(errorText(e)),
    });
    return (_jsxs("div", { className: "grid lg:grid-cols-[380px_1fr] gap-4 items-start", children: [_jsxs(Panel, { title: "Apply for leave", children: [_jsxs("form", { className: "p-4 space-y-3", onSubmit: (e) => {
                            e.preventDefault();
                            apply.mutate();
                        }, children: [_jsx(Field, { label: "Type", children: _jsxs(Select, { value: form.leaveTypeId, onChange: (e) => setForm({ ...form, leaveTypeId: e.target.value }), required: true, children: [_jsx("option", { value: "", children: "Choose" }), types?.map((t) => (_jsx("option", { value: t.id, children: t.name }, t.id)))] }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "From", children: _jsx(Input, { type: "date", value: form.fromDate, onChange: (e) => setForm({ ...form, fromDate: e.target.value }), required: true }) }), _jsx(Field, { label: "To", children: _jsx(Input, { type: "date", value: form.toDate, onChange: (e) => setForm({ ...form, toDate: e.target.value }), required: true }) })] }), _jsx(Field, { label: "Reason", children: _jsx(Input, { value: form.reason, onChange: (e) => setForm({ ...form, reason: e.target.value }), required: true, placeholder: "Short reason for the record" }) }), error && _jsx(ErrorNote, { text: error }), impact && (_jsxs(Note, { children: ["Applied. ", impact.periods, " of your periods and ", impact.studentsAffected, " students are affected \u2014 the approver will arrange cover."] })), _jsx(Button, { type: "submit", disabled: apply.isPending, children: apply.isPending ? 'Sending…' : 'Apply' })] }), balances?.length ? (_jsxs("div", { className: "border-t border-line px-4 py-3", children: [_jsx("p", { className: "text-[12.5px] text-gray-500 mb-2", children: "Balance this year" }), _jsx("ul", { className: "space-y-1", children: balances.map((b) => (_jsxs("li", { className: "flex justify-between text-[13.5px]", children: [_jsx("span", { className: "text-gray-600", children: b.leaveType.name }), _jsxs("span", { className: "tabular font-medium", children: [b.opening - b.availed, " / ", b.opening] })] }, b.id))) })] })) : null] }), _jsx(Panel, { title: "Your applications", children: isLoading ? (_jsx(Loading, {})) : !mine?.length ? (_jsx(Empty, { title: "No leave applied yet" })) : (_jsx(Table, { head: ['Type', 'From', 'To', 'Reason', 'Status', 'Cover arranged'], children: mine.map((l) => (_jsxs("tr", { children: [_jsx(Td, { children: l.leaveType.name }), _jsx(Td, { className: "tabular", children: dateIn(l.fromDate) }), _jsx(Td, { className: "tabular", children: dateIn(l.toDate) }), _jsx(Td, { className: "text-gray-600 max-w-[220px] truncate", children: l.reason }), _jsx(Td, { children: _jsx(Badge, { tone: statusTone(l.status), children: l.status.toLowerCase() }) }), _jsx(Td, { className: "tabular", children: l.substitutions?.length
                                    ? `${l.substitutions.filter((s) => s.substituteStaff).length} of ${l.substitutions.length}`
                                    : '—' })] }, l.id))) })) })] }));
}
/* ---------------------------------------------------------------- approve */
function Approvals() {
    const qc = useQueryClient();
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);
    const { data, isLoading } = useQuery({ queryKey: ['pending-leaves'], queryFn: () => get('/leaves/pending') });
    const { data: studentLeaves } = useQuery({
        queryKey: ['pending-student-leaves'],
        queryFn: () => get('/students/leaves/pending'),
    });
    const decide = useMutation({
        mutationFn: ({ id, approve }) => patch(`/leaves/${id}/decision`, { approve }),
        onSuccess: (res) => {
            setError('');
            qc.invalidateQueries({ queryKey: ['pending-leaves'] });
            qc.invalidateQueries({ queryKey: ['sub-board'] });
            if (res.substitutionsCreated)
                setError(`Approved. ${res.substitutionsCreated} periods now need cover — open the substitution board.`);
        },
        onError: (e) => setError(errorText(e)),
    });
    const decideStudent = useMutation({
        mutationFn: ({ id, approve }) => patch(`/students/leaves/${id}/decision`, { approve }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-student-leaves'] }),
    });
    if (isLoading)
        return _jsx(Loading, {});
    return (_jsxs("div", { className: "space-y-4", children: [error && _jsx(Note, { children: error }), _jsx(Panel, { title: "Staff leave", subtitle: "Approving generates the cover list automatically", children: !data?.length ? (_jsx(Empty, { title: "No leave waiting", hint: "Applications appear here the moment a teacher applies." })) : (_jsx("ul", { className: "divide-y divide-line", children: data.map((l) => (_jsxs("li", { className: "px-4 py-3", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "text-[14.5px] font-medium text-ink", children: [l.staff.firstName, " ", l.staff.lastName, _jsxs("span", { className: "text-gray-400 font-normal", children: [" \u00B7 ", l.leaveType.name] })] }), _jsxs("div", { className: "text-[13px] text-gray-500 tabular", children: [dateIn(l.fromDate), " to ", dateIn(l.toDate), " \u00B7 ", l.reason] }), _jsxs("button", { onClick: () => setOpenId(openId === l.id ? null : l.id), className: "text-[12.5px] text-teal mt-1", children: [l.impact.periods, " periods affected, ", l.impact.studentsAffected, " students \u2014", ' ', openId === l.id ? 'hide' : 'see which'] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => decide.mutate({ id: l.id, approve: false }), children: "Reject" }), _jsx(Button, { size: "sm", onClick: () => decide.mutate({ id: l.id, approve: true }), children: "Approve" })] })] }), openId === l.id && (_jsx("div", { className: "mt-3 border border-line rounded-md bg-canvas", children: _jsx(Table, { head: ['Date', 'Period', 'Class', 'Subject', 'Students'], children: l.impact.rows.map((r, i) => (_jsxs("tr", { children: [_jsx(Td, { className: "tabular", children: dateIn(r.date) }), _jsxs(Td, { className: "tabular", children: [r.periodNo, " \u00B7 ", r.time] }), _jsx(Td, { children: r.section }), _jsx(Td, { children: r.subject }), _jsx(Td, { className: "tabular", children: r.students })] }, i))) }) }))] }, l.id))) })) }), _jsx(Panel, { title: "Student leave", children: !studentLeaves?.length ? (_jsx(Empty, { title: "No student leave requests" })) : (_jsx(Table, { head: ['Student', 'From', 'To', 'Reason', ''], children: studentLeaves.map((l) => (_jsxs("tr", { children: [_jsxs(Td, { children: [l.student.firstName, " ", l.student.lastName] }), _jsx(Td, { className: "tabular", children: dateIn(l.fromDate) }), _jsx(Td, { className: "tabular", children: dateIn(l.toDate) }), _jsx(Td, { className: "text-gray-600", children: l.reason }), _jsx(Td, { children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => decideStudent.mutate({ id: l.id, approve: false }), children: "Reject" }), _jsx(Button, { size: "sm", onClick: () => decideStudent.mutate({ id: l.id, approve: true }), children: "Approve" })] }) })] }, l.id))) })) })] }));
}
