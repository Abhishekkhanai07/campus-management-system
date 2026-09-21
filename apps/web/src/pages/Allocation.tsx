import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, errorText } from '../lib/api';
import {
  Badge, Button, Empty, ErrorNote, Loading, Panel, Select, Table, Td, PageTitle,
} from '../components/ui';

export default function Allocation() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ sectionId: string; subjectId: string } | null>(null);

  const { data: matrix, isLoading } = useQuery({
    queryKey: ['alloc-matrix'],
    queryFn: () => get<any[]>('/academic/allocations/matrix'),
  });
  const { data: staff } = useQuery({
    queryKey: ['staff', 'teaching'],
    queryFn: () => get<any[]>('/staff', { teachingOnly: 'true' }),
  });
  const { data: sections } = useQuery({ queryKey: ['sections'], queryFn: () => get<any[]>('/academic/sections') });

  const allocate = useMutation({
    mutationFn: (body: any) => post('/academic/allocations', body),
    onSuccess: () => {
      setEditing(null);
      setError('');
      qc.invalidateQueries({ queryKey: ['alloc-matrix'] });
    },
    onError: (e) => setError(errorText(e)),
  });

  const setClassTeacher = useMutation({
    mutationFn: ({ sectionId, staffId }: any) =>
      patch(`/academic/sections/${sectionId}/class-teacher`, { staffId }),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['sections'] });
    },
    onError: (e) => setError(errorText(e)),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <PageTitle
        title="Subject allocation"
        subtitle="Who teaches which subject in which section, and who owns each class."
      />

      {error && <div className="mb-4"><ErrorNote text={error} /></div>}

      <Panel title="Class teachers" className="mb-4">
        <Table head={['Class', 'Strength', 'Class teacher']}>
          {sections?.map((s: any) => (
            <tr key={s.id}>
              <Td className="font-medium">{s.classLevel.name} {s.name}</Td>
              <Td className="tabular">{s._count.enrollments} / {s.capacity}</Td>
              <Td>
                <Select
                  value={s.classTeacherId || ''}
                  onChange={(e) => setClassTeacher.mutate({ sectionId: s.id, staffId: e.target.value })}
                  className="max-w-[260px]"
                >
                  <option value="">Not assigned</option>
                  {staff?.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </Select>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      {matrix?.map((row) => (
        <Panel key={row.sectionId} title={row.section} className="mb-4">
          <Table head={['Subject', 'Teacher', '']}>
            {row.subjects.map((s: any) => {
              const isEditing = editing?.sectionId === row.sectionId && editing?.subjectId === s.subjectId;
              return (
                <tr key={s.subjectId}>
                  <Td>{s.subject}</Td>
                  <Td>
                    {isEditing ? (
                      <Select
                        autoFocus
                        defaultValue=""
                        onChange={(e) =>
                          allocate.mutate({
                            staffId: e.target.value,
                            subjectId: s.subjectId,
                            sectionId: row.sectionId,
                          })
                        }
                        className="max-w-[260px]"
                      >
                        <option value="">Choose a teacher</option>
                        {staff?.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                        ))}
                      </Select>
                    ) : s.teacher ? (
                      <span className="font-medium">{s.teacher}</span>
                    ) : (
                      <Badge tone="absent">not allotted</Badge>
                    )}
                  </Td>
                  <Td>
                    {!isEditing && (
                      <Button
                        size="sm"
                        variant={s.teacher ? 'ghost' : 'primary'}
                        onClick={() => setEditing({ sectionId: row.sectionId, subjectId: s.subjectId })}
                      >
                        {s.teacher ? 'Change' : 'Allot'}
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      ))}

      {!matrix?.length && <Empty title="No sections set up yet" hint="Add classes and sections in Setup first." />}
    </>
  );
}
