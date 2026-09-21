import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dateIn, todayIso } from '../lib/format';
import {
  Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Select, Table, Td,
  PageTitle, statusTone,
} from '../components/ui';

export default function Assignments() {
  const user = useAuth((s) => s.user)!;
  if (['STUDENT', 'PARENT'].includes(user.role)) return <StudentAssignments />;
  return <TeacherAssignments />;
}

/* ---------------------------------------------------------------- teacher */

function TeacherAssignments() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', subjectId: '', sectionId: '', dueDate: todayIso(), maxMarks: 10,
  });

  const { data: teaching } = useQuery({ queryKey: ['my-teaching'], queryFn: () => get<any>('/staff/me/teaching') });
  const { data, isLoading } = useQuery({ queryKey: ['assignments'], queryFn: () => get<any[]>('/assignments') });

  const create = useMutation({
    mutationFn: () => post('/assignments', { ...form, maxMarks: Number(form.maxMarks) }),
    onSuccess: () => {
      setShowForm(false);
      setError('');
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (e) => setError(errorText(e)),
  });

  const allocations = teaching?.allocations || [];
  const sections = Array.from(new Map(allocations.map((a: any) => [a.sectionId, a.section])).entries());
  const subjectsForSection = allocations.filter((a: any) => a.sectionId === form.sectionId);

  return (
    <>
      <PageTitle
        title="Assignments"
        subtitle="Every assignment shows who has submitted and who has not."
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'New assignment'}</Button>}
      />

      {showForm && (
        <Panel title="New assignment" className="mb-4">
          <form
            className="p-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          >
            <Field label="Class">
              <Select value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value, subjectId: '' })} required>
                <option value="">Choose</option>
                {sections.map(([id, label]: any) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                <option value="">Choose</option>
                {subjectsForSection.map((a: any) => (
                  <option key={a.subjectId} value={a.subjectId}>{a.subject}</option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Due date">
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </Field>
            <Field label="What students should do">
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Maximum marks">
              <Input type="number" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })} />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create and notify the class'}
              </Button>
              {error && <ErrorNote text={error} />}
            </div>
          </form>
        </Panel>
      )}

      <Panel title="All assignments">
        {isLoading ? (
          <Loading />
        ) : !data?.length ? (
          <Empty title="No assignments yet" hint="Create one and every student in the section gets it." />
        ) : (
          <Table head={['Title', 'Class', 'Subject', 'Due', 'Submitted', 'To evaluate', '']}>
            {data.map((a: any) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.title}</Td>
                <Td>{a.section}</Td>
                <Td>{a.subject}</Td>
                <Td className="tabular">
                  {dateIn(a.dueDate)} {a.isOverdue && <Badge tone="absent">closed</Badge>}
                </Td>
                <Td className="tabular">
                  {a.submitted} / {a.total}
                  {a.pending > 0 && <span className="text-rose ml-1">({a.pending} not submitted)</span>}
                </Td>
                <Td className="tabular">{a.submitted - a.evaluated}</Td>
                <Td>
                  <Link to={`/assignments/${a.id}`}>
                    <Button size="sm" variant="secondary">Open</Button>
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------------- student */

function StudentAssignments() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const [error, setError] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['assignments'], queryFn: () => get<any[]>('/assignments') });

  const submit = useMutation({
    mutationFn: (id: string) => post(`/assignments/${id}/submit`, { content: 'Submitted from the portal' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
    onError: (e) => setError(errorText(e)),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <PageTitle title="Assignments" subtitle="What is due, what you have submitted, and what was marked." />
      {error && <div className="mb-4"><ErrorNote text={error} /></div>}

      <Panel>
        {!data?.length ? (
          <Empty title="Nothing assigned yet" />
        ) : (
          <Table head={['Assignment', 'Subject', 'Teacher', 'Due', 'Status', 'Marks', '']}>
            {data.map((a: any) => (
              <tr key={a.submissionId}>
                <Td className="font-medium">{a.title}</Td>
                <Td>{a.subject}</Td>
                <Td className="text-gray-600">{a.teacher}</Td>
                <Td className="tabular">{dateIn(a.dueDate)}</Td>
                <Td>
                  <Badge tone={statusTone(a.status)}>{a.status.toLowerCase()}</Badge>
                </Td>
                <Td className="tabular">{a.marks != null ? `${a.marks}/${a.maxMarks}` : '—'}</Td>
                <Td>
                  {a.status === 'PENDING' && user.role === 'STUDENT' && (
                    <Button size="sm" onClick={() => submit.mutate(a.id)} disabled={submit.isPending}>
                      Mark as submitted
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
