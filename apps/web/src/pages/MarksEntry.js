import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Empty, ErrorNote, Field, Loading, Note, Panel, Select, Table, Td, PageTitle, } from '../components/ui';
export default function MarksEntry() {
    const { examId } = useParams();
    const user = useAuth((s) => s.user);
    const canCorrectLocked = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
    const [sectionId, setSectionId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [values, setValues] = useState({});
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');
    const { data: teaching } = useQuery({
        queryKey: ['my-teaching'],
        queryFn: () => get('/staff/me/teaching'),
        enabled: !!user.staffId,
    });
    const { data: sections } = useQuery({
        queryKey: ['sections'],
        queryFn: () => get('/academic/sections'),
        enabled: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
    });
    const { data: subjects } = useQuery({
        queryKey: ['subjects'],
        queryFn: () => get('/academic/subjects'),
        enabled: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
    });
    const sectionOptions = sections
        ? sections.map((s) => ({ id: s.id, label: `${s.classLevel.name} ${s.name}` }))
        : Array.from(new Map((teaching?.allocations || []).map((a) => [a.sectionId, a.section])).entries())
            .map(([id, label]) => ({ id, label }));
    const subjectOptions = subjects
        ? subjects.map((s) => ({ id: s.id, label: s.name }))
        : (teaching?.allocations || [])
            .filter((a) => a.sectionId === sectionId)
            .map((a) => ({ id: a.subjectId, label: a.subject }));
    const { data: sheet, isLoading, refetch } = useQuery({
        queryKey: ['marks-sheet', examId, sectionId, subjectId],
        queryFn: () => get('/exams/marks-sheet', { examId, sectionId, subjectId }),
        enabled: !!examId && !!sectionId && !!subjectId,
        retry: false,
    });
    useEffect(() => {
        if (!sheet?.rows)
            return;
        const next = {};
        for (const r of sheet.rows)
            next[r.studentId] = r.marksObtained ?? '';
        setValues(next);
        setSaved('');
    }, [sheet]);
    const save = async () => {
        setError('');
        try {
            const rows = Object.entries(values).map(([studentId, v]) => ({
                studentId,
                marksObtained: v === '' ? null : Number(v),
                status: v === '' ? 'ABSENT' : 'PRESENT',
            }));
            const res = await post('/exams/marks', { examId, sectionId, subjectId, rows });
            setSaved(`Saved marks for ${res.saved} students`);
            refetch();
        }
        catch (err) {
            setError(errorText(err));
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Marks entry", subtitle: "Leave a box empty for a student who was absent.", action: _jsx(Link, { to: "/exams", className: "text-[13.5px] text-teal", children: "Back to exams" }) }), _jsx(Panel, { className: "mb-4", children: _jsxs("div", { className: "p-4 grid sm:grid-cols-2 gap-3", children: [_jsx(Field, { label: "Class", children: _jsxs(Select, { value: sectionId, onChange: (e) => setSectionId(e.target.value), children: [_jsx("option", { value: "", children: "Choose" }), sectionOptions.map((s) => (_jsx("option", { value: s.id, children: s.label }, s.id)))] }) }), _jsx(Field, { label: "Subject", children: _jsxs(Select, { value: subjectId, onChange: (e) => setSubjectId(e.target.value), children: [_jsx("option", { value: "", children: "Choose" }), subjectOptions.map((s) => (_jsx("option", { value: s.id, children: s.label }, s.id)))] }) })] }) }), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), isLoading && _jsx(Loading, {}), sheet && (_jsxs(_Fragment, { children: [sheet.isLocked && (_jsx("div", { className: "mb-4", children: _jsxs(Note, { children: ["Marks for this exam are locked because results have been processed.", canCorrectLocked
                                    ? ' You can correct them as an administrator, then reprocess the results.'
                                    : ' An admin correction is needed to change them.'] }) })), _jsx(Panel, { title: `${sheet.subject.name} · out of ${sheet.subject.maxMarks}`, subtitle: `${sheet.rows.length} students`, children: sheet.rows.length === 0 ? (_jsx(Empty, { title: "No students in this section" })) : (_jsx(Table, { head: ['Roll', 'Student', 'Marks'], children: sheet.rows.map((r) => (_jsxs("tr", { children: [_jsx(Td, { className: "tabular text-gray-500", children: r.rollNo }), _jsx(Td, { className: "font-medium", children: r.name }), _jsxs(Td, { children: [_jsx("input", { type: "number", value: values[r.studentId] ?? '', disabled: sheet.isLocked && !canCorrectLocked, max: sheet.subject.maxMarks, min: 0, onChange: (e) => setValues({ ...values, [r.studentId]: e.target.value }), className: "w-24 border border-line rounded-md px-2 py-1.5 tabular text-[14px] focus:border-teal outline-none disabled:bg-canvas" }), _jsxs("span", { className: "text-gray-400 text-[13px] ml-2", children: ["/ ", sheet.subject.maxMarks] })] })] }, r.studentId))) })) }), _jsxs("div", { className: "sticky bottom-0 mt-4 bg-white border border-line rounded-lg px-4 py-3 flex items-center justify-between shadow-lg", children: [_jsxs("span", { className: "text-[13.5px] text-gray-500", children: [Object.values(values).filter((v) => v !== '').length, " of ", sheet.rows.length, " entered"] }), _jsxs("div", { className: "flex items-center gap-3", children: [saved && _jsx("span", { className: "text-[13px] text-grass", children: saved }), _jsx(Button, { onClick: save, disabled: sheet.isLocked && !canCorrectLocked, children: sheet.isLocked ? 'Save correction' : 'Save marks' })] })] })] }))] }));
}
