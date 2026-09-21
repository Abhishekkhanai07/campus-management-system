import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import {
  Badge, Empty, Input, Loading, Panel, Stat, Table, Td, PageTitle,
} from '../components/ui';

export default function Staff() {
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['staff', q],
    queryFn: () => get<any[]>('/staff', { q: q || undefined }),
  });

  return (
    <>
      <PageTitle title="Teachers and staff" subtitle="Who teaches what, how many students, and which class they own." />

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or employee code"
        className="max-w-[320px] mb-4"
      />

      <Panel title={data ? `${data.length} staff` : 'Staff'}>
        {isLoading ? (
          <Loading />
        ) : !data?.length ? (
          <Empty title="No staff matched" />
        ) : (
          <Table head={['Code', 'Name', 'Designation', 'Department', 'Class teacher of', 'Subjects', 'Periods/week']}>
            {data.map((s: any) => (
              <tr key={s.id} className="cursor-pointer hover:bg-canvas" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                <Td className="tabular text-gray-500">{s.employeeCode}</Td>
                <Td className="font-medium">{s.firstName} {s.lastName}</Td>
                <Td className="text-gray-600">{s.designation || '—'}</Td>
                <Td>{s.department?.name || '—'}</Td>
                <Td>
                  {s.classTeacherOf.length
                    ? s.classTeacherOf.map((c: any) => `${c.classLevel.name} ${c.name}`).join(', ')
                    : <span className="text-gray-400">—</span>}
                </Td>
                <Td className="tabular">{s._count.allocations}</Td>
                <Td className="tabular">
                  {s._count.slots}
                  {s._count.slots > s.maxPeriodsPerWeek && <Badge tone="absent">over limit</Badge>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      {openId && <StaffDetail id={openId} />}
    </>
  );
}

function StaffDetail({ id }: { id: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['staff-detail', id], queryFn: () => get<any>(`/staff/${id}`) });
  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Subjects" value={data.summary.subjectsTaught} />
        <Stat label="Sections" value={data.summary.sectionsTaught} />
        <Stat label="Students taught" value={data.summary.studentsTaught} tone="teal" />
        <Stat
          label="Periods per week"
          value={`${data.summary.periodsPerWeek} / ${data.summary.maxPeriodsPerWeek}`}
          tone={data.summary.periodsPerWeek > data.summary.maxPeriodsPerWeek ? 'rose' : 'default'}
        />
      </div>

      <Panel title={`${data.firstName} ${data.lastName} teaches`}>
        {data.allocations.length === 0 ? (
          <Empty title="No subjects allotted yet" />
        ) : (
          <Table head={['Subject', 'Class', 'Students']}>
            {data.allocations.map((a: any) => (
              <tr key={a.id}>
                <Td>{a.subject.name}</Td>
                <Td>{a.section.classLevel.name} {a.section.name}</Td>
                <Td className="tabular">{a.section._count.enrollments}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
