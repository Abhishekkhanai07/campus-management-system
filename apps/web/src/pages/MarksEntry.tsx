import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Button, Empty, ErrorNote, Field, Loading, Note, Panel, Select, Table, Td, PageTitle,
} from '../components/ui';

export default function MarksEntry() {
  const { examId } = useParams();
  const user = useAuth((s) => s.user)!;
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const { data: teaching } = useQuery({
    queryKey: ['my-teaching'],
    queryFn: () => get<any>('/staff/me/teaching'),
    enabled: !!user.staffId,
  });
  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => get<any[]>('/academic/sections'),
    enabled: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => get<any[]>('/academic/subjects'),
    enabled: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
  });

  const sectionOptions = sections
    ? sections.map((s: any) => ({ id: s.id, label: `${s.classLevel.name} ${s.name}` }))
    : Array.from(new Map((teaching?.allocations || []).map((a: any) => [a.sectionId, a.section])).entries())
        .map(([id, label]: any) => ({ id, label }));

  const subjectOptions = subjects
    ? subjects.map((s: any) => ({ id: s.id, label: s.name }))
    : (teaching?.allocations || [])
        .filter((a: any) => a.sectionId === sectionId)
        .map((a: any) => ({ id: a.subjectId, label: a.subject }));

  const { data: sheet, isLoading, refetch } = useQuery({
    queryKey: ['marks-sheet', examId, sectionId, subjectId],
    queryFn: () => get<any>('/exams/marks-sheet', { examId, sectionId, subjectId }),
    enabled: !!examId && !!sectionId && !!subjectId,
    retry: false,
  });

  useEffect(() => {
    if (!sheet?.rows) return;
    const next: Record<string, string> = {};
    for (const r of sheet.rows) next[r.studentId] = r.marksObtained ?? '';
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
      const res = await post<any>('/exams/marks', { examId, sectionId, subjectId, rows });
      setSaved(`Saved marks for ${res.saved} students`);
      refetch();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <>
      <PageTitle
        title="Marks entry"
        subtitle="Leave a box empty for a student who was absent."
        action={<Link to="/exams" className="text-[13.5px] text-teal">Back to exams</Link>}
      />

      <Panel className="mb-4">
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          <Field label="Class">
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">Choose</option>
              {sectionOptions.map((s: any) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Subject">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Choose</option>
              {subjectOptions.map((s: any) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      {error && <div className="mb-4"><ErrorNote text={error} /></div>}
      {isLoading && <Loading />}

      {sheet && (
        <>
          {sheet.isLocked && (
            <div className="mb-4">
              <Note>
                Marks for this exam are locked because results have been processed.
                An admin correction is needed to change them.
              </Note>
            </div>
          )}

          <Panel
            title={`${sheet.subject.name} · out of ${sheet.subject.maxMarks}`}
            subtitle={`${sheet.rows.length} students`}
          >
            {sheet.rows.length === 0 ? (
              <Empty title="No students in this section" />
            ) : (
              <Table head={['Roll', 'Student', 'Marks']}>
                {sheet.rows.map((r: any) => (
                  <tr key={r.studentId}>
                    <Td className="tabular text-gray-500">{r.rollNo}</Td>
                    <Td className="font-medium">{r.name}</Td>
                    <Td>
                      <input
                        type="number"
                        value={values[r.studentId] ?? ''}
                        disabled={sheet.isLocked}
                        max={sheet.subject.maxMarks}
                        min={0}
                        onChange={(e) => setValues({ ...values, [r.studentId]: e.target.value })}
                        className="w-24 border border-line rounded-md px-2 py-1.5 tabular text-[14px] focus:border-teal outline-none disabled:bg-canvas"
                      />
                      <span className="text-gray-400 text-[13px] ml-2">/ {sheet.subject.maxMarks}</span>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>

          <div className="sticky bottom-0 mt-4 bg-white border border-line rounded-lg px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-[13.5px] text-gray-500">
              {Object.values(values).filter((v) => v !== '').length} of {sheet.rows.length} entered
            </span>
            <div className="flex items-center gap-3">
              {saved && <span className="text-[13px] text-grass">{saved}</span>}
              <Button onClick={save} disabled={sheet.isLocked}>Save marks</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
