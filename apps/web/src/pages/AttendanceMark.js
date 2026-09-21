import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { todayIso } from '../lib/format';
import { Button, Empty, ErrorNote, Loading, Note, Panel, PageTitle, Select, Field, } from '../components/ui';
const CYCLE = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'];
const LABEL = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
    LATE: 'Late',
    ON_LEAVE: 'Leave',
};
const SWATCH = {
    PRESENT: 'bg-grass-light border-grass/30 text-grass',
    ABSENT: 'bg-rose-light border-rose/30 text-rose',
    LATE: 'bg-amber-light border-amber/30 text-amber',
    ON_LEAVE: 'bg-gray-100 border-gray-300 text-gray-600',
};
export default function AttendanceMark() {
    const user = useAuth((s) => s.user);
    const [params, setParams] = useSearchParams();
    const [mode, setMode] = useState(params.get('slotId') ? 'period' : 'daily');
    const [date, setDate] = useState(params.get('date') || todayIso());
    const [sectionId, setSectionId] = useState(params.get('sectionId') || '');
    const [slotId, setSlotId] = useState(params.get('slotId') || '');
    const [marks, setMarks] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');
    // what this teacher is allowed to mark
    const { data: teaching } = useQuery({
        queryKey: ['my-teaching'],
        queryFn: () => get('/staff/me/teaching'),
        enabled: ['TEACHER', 'HOD'].includes(user.role),
    });
    const { data: sections } = useQuery({
        queryKey: ['sections'],
        queryFn: () => get('/academic/sections'),
        enabled: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
    });
    const sectionOptions = useMemo(() => {
        if (sections)
            return sections.map((s) => ({ id: s.id, label: `${s.classLevel.name} ${s.name}` }));
        return (teaching?.classTeacherOf || []).map((c) => ({ id: c.sectionId, label: c.section }));
    }, [sections, teaching]);
    const slotOptions = teaching?.todaySlots || [];
    useEffect(() => {
        if (!sectionId && sectionOptions.length === 1)
            setSectionId(sectionOptions[0].id);
    }, [sectionOptions]);
    const rosterKey = mode === 'daily'
        ? ['roster-daily', sectionId, date]
        : ['roster-period', slotId, date];
    const { data: roster, isLoading, refetch } = useQuery({
        queryKey: rosterKey,
        queryFn: () => mode === 'daily'
            ? get('/attendance/daily/roster', { sectionId, date })
            : get('/attendance/period/roster', { slotId, date }),
        enabled: mode === 'daily' ? !!sectionId && !!date : !!slotId && !!date,
        retry: false,
    });
    // seed the local marks from whatever is already saved
    useEffect(() => {
        if (!roster?.rows)
            return;
        const next = {};
        for (const r of roster.rows)
            next[r.studentId] = r.status;
        setMarks(next);
        setSaved('');
    }, [roster]);
    const counts = useMemo(() => {
        const vals = Object.values(marks);
        return {
            total: vals.length,
            present: vals.filter((v) => v === 'PRESENT').length,
            absent: vals.filter((v) => v === 'ABSENT').length,
            late: vals.filter((v) => v === 'LATE').length,
            leave: vals.filter((v) => v === 'ON_LEAVE').length,
        };
    }, [marks]);
    const cycle = (studentId) => setMarks((m) => {
        const cur = m[studentId] || 'PRESENT';
        const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
        return { ...m, [studentId]: next };
    });
    const setAll = (status) => setMarks((m) => Object.fromEntries(Object.keys(m).map((k) => [k, status])));
    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const rows = Object.entries(marks).map(([studentId, status]) => ({ studentId, status }));
            const res = mode === 'daily'
                ? await post('/attendance/daily', { sectionId, date, rows })
                : await post('/attendance/period', { slotId, date, rows });
            setSaved(res.message || `Saved ${res.saved} students`);
            refetch();
        }
        catch (err) {
            setError(errorText(err));
        }
        finally {
            setSaving(false);
        }
    };
    const switchMode = (m) => {
        setMode(m);
        setError('');
        setParams({});
    };
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Take attendance", subtitle: "Everyone starts as present. Tap a student to change them." }), _jsx(Panel, { className: "mb-4", children: _jsxs("div", { className: "p-4 grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] items-end", children: [_jsxs("div", { className: "inline-flex rounded-md border border-line overflow-hidden", children: [_jsx("button", { onClick: () => switchMode('daily'), className: `px-3 py-2 text-[13.5px] ${mode === 'daily' ? 'bg-ink text-white' : 'bg-white text-gray-600'}`, children: "Day register" }), _jsx("button", { onClick: () => switchMode('period'), className: `px-3 py-2 text-[13.5px] border-l border-line ${mode === 'period' ? 'bg-ink text-white' : 'bg-white text-gray-600'}`, children: "Subject period" })] }), mode === 'daily' ? (_jsx(Field, { label: "Class", children: _jsxs(Select, { value: sectionId, onChange: (e) => setSectionId(e.target.value), children: [_jsx("option", { value: "", children: "Choose a class" }), sectionOptions.map((s) => (_jsx("option", { value: s.id, children: s.label }, s.id)))] }) })) : (_jsx(Field, { label: "Period", children: _jsxs(Select, { value: slotId, onChange: (e) => setSlotId(e.target.value), children: [_jsx("option", { value: "", children: "Choose a period from today" }), slotOptions.map((s) => (_jsxs("option", { value: s.id, children: ["Period ", s.periodNo, " \u00B7 ", s.subject, " \u00B7 ", s.section] }, s.id)))] }) })), _jsx(Field, { label: "Date", children: _jsx("input", { type: "date", value: date, max: todayIso(), onChange: (e) => setDate(e.target.value), className: "w-full border border-line rounded-md px-3 py-2 text-[14px] bg-white focus:border-teal outline-none" }) }), _jsx("div", { className: "flex gap-2", children: _jsx(Button, { variant: "secondary", size: "md", onClick: () => setAll('PRESENT'), disabled: !roster, children: "All present" }) })] }) }), mode === 'daily' && sectionOptions.length === 0 && (_jsx(Note, { children: "You are not a class teacher of any section, so the day register is not yours to mark. Switch to \u201CSubject period\u201D to mark your own periods." })), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), isLoading && _jsx(Loading, { label: "Loading the roster" }), roster && (_jsxs(_Fragment, { children: [roster.isHoliday && _jsx(Note, { children: "This date is a declared holiday, so attendance is not taken." }), roster.substitute && (_jsx("div", { className: "mb-4", children: _jsxs(Note, { children: [roster.slot.regularTeacher, " is absent. ", roster.substitute, " is covering this period."] }) })), _jsx(Panel, { title: mode === 'daily'
                            ? `${roster.section.name} · ${roster.rows.length} students`
                            : `${roster.slot.section} · ${roster.slot.subject} · period ${roster.slot.periodNo}`, subtitle: roster.alreadyMarked ? 'Already marked — saving again will update it' : 'Not marked yet', children: roster.rows.length === 0 ? (_jsx(Empty, { title: "No students enrolled in this section" })) : (_jsx("div", { className: "p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3", children: roster.rows.map((r) => {
                                const status = marks[r.studentId] || 'PRESENT';
                                return (_jsxs("button", { onClick: () => cycle(r.studentId), className: `flex items-center justify-between gap-3 border rounded-md px-3 py-2.5 text-left transition-colors ${SWATCH[status]}`, children: [_jsxs("span", { className: "min-w-0", children: [_jsxs("span", { className: "block text-[14px] font-medium text-ink truncate", children: [_jsx("span", { className: "tabular text-gray-500 mr-2", children: r.rollNo ?? '–' }), r.name] }), _jsx("span", { className: "block text-[11.5px] text-gray-500 tabular", children: r.admissionNo || '' })] }), _jsx("span", { className: "text-[12.5px] font-semibold whitespace-nowrap", children: LABEL[status] })] }, r.studentId));
                            }) })) }), _jsxs("div", { className: "sticky bottom-0 mt-4 bg-white border border-line rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg", children: [_jsxs("div", { className: "flex gap-5 text-[13.5px] tabular", children: [_jsxs("span", { className: "text-grass", children: [counts.present, " present"] }), _jsxs("span", { className: "text-rose", children: [counts.absent, " absent"] }), _jsxs("span", { className: "text-amber", children: [counts.late, " late"] }), _jsxs("span", { className: "text-gray-500", children: [counts.leave, " on leave"] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [saved && _jsx("span", { className: "text-[13px] text-grass", children: saved }), _jsx(Button, { onClick: save, disabled: saving || !roster.rows.length || roster.isHoliday, children: saving ? 'Saving…' : roster.alreadyMarked ? 'Update attendance' : 'Save attendance' })] })] })] }))] }));
}
