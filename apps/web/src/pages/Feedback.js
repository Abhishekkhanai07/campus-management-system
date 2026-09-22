import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, get, patch, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Select, Table, Td, PageTitle, Textarea, statusTone } from '../components/ui';
const monthValue = () => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
};
export default function Feedback() {
    const user = useAuth((state) => state.user);
    const isStudent = user.role === 'STUDENT';
    const [error, setError] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [month, setMonth] = useState(monthValue());
    const [rating, setRating] = useState('5');
    const [comments, setComments] = useState('');
    const qc = useQueryClient();
    const { data: mine, isLoading: mineLoading } = useQuery({
        queryKey: ['my-feedback'], queryFn: () => get('/feedback/mine'), enabled: isStudent,
    });
    const { data: teachers } = useQuery({
        queryKey: ['feedback-teachers'], queryFn: () => get('/feedback/teachers'), enabled: isStudent,
    });
    const { data: complaints, isLoading: complaintsLoading } = useQuery({
        queryKey: ['feedback-complaints'], queryFn: () => get('/feedback/complaints'), enabled: !isStudent,
    });
    const { data: monthly, isLoading: monthlyLoading } = useQuery({
        queryKey: ['feedback-monthly'], queryFn: () => get('/feedback/monthly'), enabled: !isStudent,
    });
    const submitComplaint = useMutation({
        mutationFn: () => post('/feedback/complaints', { teacherId, subject, description }),
        onSuccess: () => { setTeacherId(''); setSubject(''); setDescription(''); qc.invalidateQueries({ queryKey: ['my-feedback'] }); },
        onError: (e) => setError(errorText(e)),
    });
    const submitMonthly = useMutation({
        mutationFn: () => post('/feedback/monthly', { month, rating: Number(rating), comments }),
        onSuccess: () => { setComments(''); qc.invalidateQueries({ queryKey: ['my-feedback'] }); },
        onError: (e) => setError(errorText(e)),
    });
    const updateComplaint = useMutation({
        mutationFn: ({ id, status }) => patch(`/feedback/complaints/${id}`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-complaints'] }),
        onError: (e) => setError(errorText(e)),
    });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Student voice", subtitle: isStudent ? 'Share a concern privately with school management and rate your class each month.' : 'Review student complaints and monthly class feedback. Teachers cannot access this area.' }), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), isStudent ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid lg:grid-cols-2 gap-4", children: [_jsx(Panel, { title: "Report a teacher concern", subtitle: "This goes to administrators and heads of department only.", children: _jsxs("form", { className: "p-4 space-y-3", onSubmit: (e) => { e.preventDefault(); submitComplaint.mutate(); }, children: [_jsx(Field, { label: "Teacher", children: _jsxs(Select, { value: teacherId, onChange: (e) => setTeacherId(e.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose teacher" }), teachers?.map((teacher) => _jsxs("option", { value: teacher.id, children: [teacher.name, " \u00B7 ", teacher.subject] }, teacher.id))] }) }), _jsx(Field, { label: "Subject", children: _jsx(Input, { value: subject, onChange: (e) => setSubject(e.target.value), placeholder: "What is this about?", required: true }) }), _jsx(Field, { label: "Details", children: _jsx(Textarea, { value: description, onChange: (e) => setDescription(e.target.value), rows: 4, placeholder: "Describe what happened", required: true }) }), _jsx(Button, { type: "submit", disabled: submitComplaint.isPending, children: "Submit privately" })] }) }), _jsx(Panel, { title: "Monthly class feedback", subtitle: "One response per month. Your name is visible only to management.", children: _jsxs("form", { className: "p-4 space-y-3", onSubmit: (e) => { e.preventDefault(); submitMonthly.mutate(); }, children: [_jsx(Field, { label: "Month", children: _jsx(Input, { type: "month", value: month.slice(0, 7), onChange: (e) => setMonth(`${e.target.value}-01`), required: true }) }), _jsx(Field, { label: "Class rating", children: _jsxs(Select, { value: rating, onChange: (e) => setRating(e.target.value), children: [_jsx("option", { value: "5", children: "5 \u00B7 Excellent" }), _jsx("option", { value: "4", children: "4 \u00B7 Good" }), _jsx("option", { value: "3", children: "3 \u00B7 Fair" }), _jsx("option", { value: "2", children: "2 \u00B7 Needs improvement" }), _jsx("option", { value: "1", children: "1 \u00B7 Poor" })] }) }), _jsx(Field, { label: "Comments", children: _jsx(Textarea, { value: comments, onChange: (e) => setComments(e.target.value), rows: 4, placeholder: "What should improve in your class?" }) }), _jsx(Button, { type: "submit", disabled: submitMonthly.isPending, children: "Save monthly feedback" })] }) })] }), _jsx(Panel, { title: "Your submissions", children: mineLoading ? _jsx(Loading, {}) : !mine?.complaints?.length && !mine?.monthlyFeedback?.length ? _jsx(Empty, { title: "No feedback submitted yet" }) : _jsxs("div", { className: "p-4 space-y-3 text-[13.5px]", children: [mine?.complaints?.map((item) => _jsxs("div", { className: "border-b border-line pb-3", children: [_jsxs("div", { className: "flex justify-between gap-3", children: [_jsx("strong", { children: item.subject }), _jsx(Badge, { tone: statusTone(item.status), children: item.status.replace('_', ' ').toLowerCase() })] }), _jsxs("div", { className: "text-gray-500 mt-1", children: ["To ", item.teacher.firstName, " ", item.teacher.lastName, " \u00B7 ", item.description] }), item.response && _jsxs("div", { className: "mt-2 text-teal", children: ["Management: ", item.response] })] }, item.id)), mine?.monthlyFeedback?.map((item) => _jsxs("div", { className: "border-b border-line pb-3", children: ["Monthly class feedback \u00B7 rating ", item.rating, "/5", item.comments && _jsxs("span", { className: "text-gray-500", children: [" \u00B7 ", item.comments] })] }, item.id))] }) })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsx(Panel, { title: "Teacher complaints", subtitle: "Only administrators and heads of department can see these submissions.", children: complaintsLoading ? _jsx(Loading, {}) : !complaints?.length ? _jsx(Empty, { title: "No complaints submitted" }) : _jsx(Table, { head: ['Student', 'Teacher', 'Subject', 'Details', 'Status', ''], children: complaints.map((item) => _jsxs("tr", { children: [_jsxs(Td, { className: "font-medium", children: [item.student.firstName, " ", item.student.lastName] }), _jsxs(Td, { children: [item.teacher.firstName, " ", item.teacher.lastName] }), _jsx(Td, { children: item.subject }), _jsx(Td, { className: "max-w-sm", children: item.description }), _jsx(Td, { children: _jsx(Badge, { tone: statusTone(item.status), children: item.status.replace('_', ' ').toLowerCase() }) }), _jsx(Td, { children: _jsxs(Select, { value: item.status, onChange: (e) => updateComplaint.mutate({ id: item.id, status: e.target.value }), children: [_jsx("option", { children: "OPEN" }), _jsx("option", { children: "IN_REVIEW" }), _jsx("option", { children: "RESOLVED" }), _jsx("option", { children: "CLOSED" })] }) })] }, item.id)) }) }), _jsx(Panel, { title: "Monthly class feedback", subtitle: "Use ratings and comments to identify class-level issues without exposing feedback to teachers.", children: monthlyLoading ? _jsx(Loading, {}) : !monthly?.length ? _jsx(Empty, { title: "No monthly feedback submitted" }) : _jsx(Table, { head: ['Month', 'Class', 'Student', 'Rating', 'Comments'], children: monthly.map((item) => _jsxs("tr", { children: [_jsx(Td, { children: new Date(item.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }), _jsxs(Td, { children: [item.section.classLevel.name, " ", item.section.name] }), _jsxs(Td, { children: [item.student.firstName, " ", item.student.lastName] }), _jsxs(Td, { className: "tabular", children: [item.rating, "/5"] }), _jsx(Td, { children: item.comments || '—' })] }, item.id)) }) })] }))] }));
}
