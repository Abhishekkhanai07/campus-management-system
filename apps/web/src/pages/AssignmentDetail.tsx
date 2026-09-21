import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post, errorText } from '../lib/api';
import { dateIn } from '../lib/format';
import {
  Badge, Button, Empty, ErrorNote, Input, Loading, Panel, Stat, Table, Td, PageTitle, statusTone,
} from '../components/ui';

export default function AssignmentDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [marks, setMarks] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => get<any>(`/assignments/${id}`),
  });

  const evaluate = useMutation({
    mutationFn: ({ submissionId, value }: { submissionId: string; value: number }) =>
      patch(`/assignments/submissions/${submissionId}/evaluate`, { marks: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignment', id] }),
    onError: (e) => setError(errorText(e)),
  });

  const markOffline = useMutation({
    mutationFn: (studentId: string) => post(`/assignments/${id}/offline-submission`, { studentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignment', id] }),
    onError: (e) => setError(errorText(e)),
  });

  if (isLoading) return <Loading />;
  if (!data) return <Empty title="Assignment not found" />;

  return (
    <>
      <PageTitle
        title={data.title}
        subtitle={`${data.section} · ${data.subject} · due ${dateIn(data.dueDate)}`}
        action={<Link to="/assignments" className="text-[13.5px] text-teal">Back to assignments</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Submitted" value={`${data.stats.submitted} / ${data.stats.total}`} tone="grass" />
        <Stat label="Not submitted" value={data.stats.pending} tone={data.stats.pending ? 'rose' : 'default'} />
        <Stat label="Late" value={data.stats.late} tone={data.stats.late ? 'amber' : 'default'} />
        <Stat label="Evaluated" value={data.stats.evaluated} />
      </div>

      {error && <div className="mb-4"><ErrorNote text={error} /></div>}

      <Panel title="Class list" subtitle="Tick off paper submissions and enter marks here.">
        <Table head={['Student', 'Admission no', 'Status', 'Submitted on', 'Marks', '']}>
          {data.submissions.map((s: any) => (
            <tr key={s.id} className={s.status === 'PENDING' ? 'bg-rose-light/40' : ''}>
              <Td className="font-medium">{s.name}</Td>
              <Td className="tabular text-gray-500">{s.admissionNo}</Td>
              <Td>
                <Badge tone={statusTone(s.status)}>{s.status.toLowerCase()}</Badge>
                {s.isLate && <span className="text-[12px] text-amber ml-1">late</span>}
              </Td>
              <Td className="tabular text-gray-500">{s.submittedAt ? dateIn(s.submittedAt) : '—'}</Td>
              <Td>
                {s.status === 'PENDING' ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20"
                      defaultValue={s.marks ?? ''}
                      max={data.maxMarks}
                      onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                    />
                    <span className="text-gray-400 text-[13px]">/ {data.maxMarks}</span>
                  </div>
                )}
              </Td>
              <Td>
                {s.status === 'PENDING' ? (
                  <Button size="sm" variant="secondary" onClick={() => markOffline.mutate(s.studentId)}>
                    Received on paper
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={marks[s.id] === undefined}
                    onClick={() => evaluate.mutate({ submissionId: s.id, value: Number(marks[s.id]) })}
                  >
                    Save marks
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
