import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, PercentBar, Stat, Table, Td,
  PageTitle, statusTone,
} from '../components/ui';

export default function Exams() {
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  const { data: exams, isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => get<any[]>('/exams') });

  const create = useMutation({
    mutationFn: () => post('/exams', { name, type: 'UNIT_TEST' }),
    onSuccess: () => { setName(''); qc.invalidateQueries({ queryKey: ['exams'] }); },
    onError: (e) => setError(errorText(e)),
  });

  const process = useMutation({
    mutationFn: (id: string) => post(`/exams/${id}/process`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
    onError: (e) => setError(errorText(e)),
  });

  const publish = useMutation({
    mutationFn: (id: string) => post(`/exams/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
    onError: (e) => setError(errorText(e)),
  });

  return (
    <>
      <PageTitle
        title="Exams and results"
        subtitle="Teachers enter marks. Results stay hidden from students until they are published."
      />

      {error && <div className="mb-4"><ErrorNote text={error} /></div>}

      {isAdmin && (
        <Panel title="New exam" className="mb-4">
          <form className="p-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <Field label="Exam name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Second Unit Test" required />
            </Field>
            <Button type="submit" disabled={create.isPending}>Create</Button>
          </form>
        </Panel>
      )}

      <Panel title="Exams">
        {isLoading ? (
          <Loading />
        ) : !exams?.length ? (
          <Empty title="No exams created yet" />
        ) : (
          <Table head={['Exam', 'Type', 'Status', 'Marks entered', '']}>
            {exams.map((e: any) => (
              <tr key={e.id}>
                <Td className="font-medium">{e.name}</Td>
                <Td className="text-gray-600">{e.type.replace('_', ' ').toLowerCase()}</Td>
                <Td><Badge tone={statusTone(e.status)}>{e.status.replace('_', ' ').toLowerCase()}</Badge></Td>
                <Td className="tabular">{e._count.marks}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/exams/${e.id}/marks`}>
                      <Button size="sm" variant="secondary">Enter marks</Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(selected === e.id ? null : e.id)}>
                      Analysis
                    </Button>
                    {isAdmin && e.status === 'MARKS_ENTRY' && (
                      <Button size="sm" onClick={() => process.mutate(e.id)}>Process results</Button>
                    )}
                    {isAdmin && e.status === 'LOCKED' && (
                      <Button size="sm" onClick={() => publish.mutate(e.id)}>Publish to students</Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      {selected && <Analysis examId={selected} />}
    </>
  );
}

function Analysis({ examId }: { examId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['exam-analysis', examId],
    queryFn: () => get<any>(`/exams/${examId}/analysis`),
  });

  if (isLoading) return <Loading />;
  if (!data || data.appeared === 0)
    return <Panel className="mt-4"><Empty title="Results are not processed yet" /></Panel>;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Appeared" value={data.appeared} />
        <Stat label="Passed" value={`${data.passPct}%`} tone={data.passPct >= 80 ? 'grass' : 'amber'} />
        <Stat label="Class average" value={`${data.average}%`} />
        <Stat label="Did not pass" value={data.failures.length} tone={data.failures.length ? 'rose' : 'grass'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Subject-wise">
          <Table head={['Subject', 'Appeared', 'Average', 'Pass rate']}>
            {data.subjectWise.map((s: any) => (
              <tr key={s.subject}>
                <Td>{s.subject}</Td>
                <Td className="tabular">{s.appeared}</Td>
                <Td className="tabular">{s.average} / {s.maxMarks}</Td>
                <Td><PercentBar value={s.passPct} min={80} /></Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Toppers">
          <Table head={['Rank', 'Student', 'Class', 'Percentage', 'Grade']}>
            {data.toppers.map((t: any) => (
              <tr key={t.rank}>
                <Td className="tabular">{t.rank}</Td>
                <Td className="font-medium">{t.name}</Td>
                <Td>{t.section}</Td>
                <Td className="tabular">{t.percentage}%</Td>
                <Td><Badge tone="present">{t.grade}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </div>
  );
}
