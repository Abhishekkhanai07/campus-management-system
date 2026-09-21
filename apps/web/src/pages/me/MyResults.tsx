import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import { Badge, Empty, Loading, Panel, Stat, Table, Td, PageTitle } from '../../components/ui';

export default function MyResults() {
  const { data, isLoading } = useQuery({ queryKey: ['my-results'], queryFn: () => get<any[]>('/exams/my-results') });

  if (isLoading) return <Loading />;

  return (
    <>
      <PageTitle title="My results" subtitle="Only exams the school has published appear here." />

      {!data?.length ? (
        <Empty title="No results published yet" hint="Results appear once the school publishes them." />
      ) : (
        data.map((r: any) => (
          <div key={r.examId} className="mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <Stat label="Exam" value={<span className="text-[16px]">{r.exam}</span>} />
              <Stat label="Percentage" value={`${r.percentage}%`} tone={r.isPass ? 'grass' : 'rose'} />
              <Stat label="Grade" value={r.grade} />
              <Stat label="Rank in class" value={r.rank} tone="teal" />
            </div>

            <Panel title="Subject marks" subtitle={`${r.total} out of ${r.maxTotal}`}>
              <Table head={['Subject', 'Marks', 'Result']}>
                {r.subjects.map((s: any) => (
                  <tr key={s.subject}>
                    <Td>{s.subject}</Td>
                    <Td className="tabular">{s.marks ?? '—'} / {s.maxMarks}</Td>
                    <Td>
                      <Badge tone={s.isPass ? 'present' : 'absent'}>{s.isPass ? 'pass' : 'fail'}</Badge>
                    </Td>
                  </tr>
                ))}
              </Table>
            </Panel>
          </div>
        ))
      )}
    </>
  );
}
