import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, errorText } from '../lib/api';
import { Badge, Button, Empty, ErrorNote, Loading, Panel, Select, Table, Td, PageTitle, } from '../components/ui';
export default function Allocation() {
    const qc = useQueryClient();
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);
    const { data: matrix, isLoading } = useQuery({
        queryKey: ['alloc-matrix'],
        queryFn: () => get('/academic/allocations/matrix'),
    });
    const { data: staff } = useQuery({
        queryKey: ['staff', 'teaching'],
        queryFn: () => get('/staff', { teachingOnly: 'true' }),
    });
    const { data: sections } = useQuery({ queryKey: ['sections'], queryFn: () => get('/academic/sections') });
    const allocate = useMutation({
        mutationFn: (body) => post('/academic/allocations', body),
        onSuccess: () => {
            setEditing(null);
            setError('');
            qc.invalidateQueries({ queryKey: ['alloc-matrix'] });
        },
        onError: (e) => setError(errorText(e)),
    });
    const setClassTeacher = useMutation({
        mutationFn: ({ sectionId, staffId }) => patch(`/academic/sections/${sectionId}/class-teacher`, { staffId }),
        onSuccess: () => {
            setError('');
            qc.invalidateQueries({ queryKey: ['sections'] });
        },
        onError: (e) => setError(errorText(e)),
    });
    if (isLoading)
        return _jsx(Loading, {});
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Subject allocation", subtitle: "Who teaches which subject in which section, and who owns each class." }), error && _jsx("div", { className: "mb-4", children: _jsx(ErrorNote, { text: error }) }), _jsx(Panel, { title: "Class teachers", className: "mb-4", children: _jsx(Table, { head: ['Class', 'Strength', 'Class teacher'], children: sections?.map((s) => (_jsxs("tr", { children: [_jsxs(Td, { className: "font-medium", children: [s.classLevel.name, " ", s.name] }), _jsxs(Td, { className: "tabular", children: [s._count.enrollments, " / ", s.capacity] }), _jsx(Td, { children: _jsxs(Select, { value: s.classTeacherId || '', onChange: (e) => setClassTeacher.mutate({ sectionId: s.id, staffId: e.target.value }), className: "max-w-[260px]", children: [_jsx("option", { value: "", children: "Not assigned" }), staff?.map((t) => (_jsxs("option", { value: t.id, children: [t.firstName, " ", t.lastName] }, t.id)))] }) })] }, s.id))) }) }), matrix?.map((row) => (_jsx(Panel, { title: row.section, className: "mb-4", children: _jsx(Table, { head: ['Subject', 'Teacher', ''], children: row.subjects.map((s) => {
                        const isEditing = editing?.sectionId === row.sectionId && editing?.subjectId === s.subjectId;
                        return (_jsxs("tr", { children: [_jsx(Td, { children: s.subject }), _jsx(Td, { children: isEditing ? (_jsxs(Select, { autoFocus: true, defaultValue: "", onChange: (e) => allocate.mutate({
                                            staffId: e.target.value,
                                            subjectId: s.subjectId,
                                            sectionId: row.sectionId,
                                        }), className: "max-w-[260px]", children: [_jsx("option", { value: "", children: "Choose a teacher" }), staff?.map((t) => (_jsxs("option", { value: t.id, children: [t.firstName, " ", t.lastName] }, t.id)))] })) : s.teacher ? (_jsx("span", { className: "font-medium", children: s.teacher })) : (_jsx(Badge, { tone: "absent", children: "not allotted" })) }), _jsx(Td, { children: !isEditing && (_jsx(Button, { size: "sm", variant: s.teacher ? 'ghost' : 'primary', onClick: () => setEditing({ sectionId: row.sectionId, subjectId: s.subjectId }), children: s.teacher ? 'Change' : 'Allot' })) })] }, s.subjectId));
                    }) }) }, row.sectionId))), !matrix?.length && _jsx(Empty, { title: "No sections set up yet", hint: "Add classes and sections in Setup first." })] }));
}
