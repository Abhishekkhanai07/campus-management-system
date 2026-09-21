import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Badge, Empty, Input, Loading, Panel, Select, Stat, Table, Td, PageTitle,
} from '../components/ui';

export default function Students() {
  const user = useAuth((s) => s.user)!;
  const [q, setQ] = useState('');
  const [sectionId, setSectionId] = useState('');

  const canSeeAll = ['SUPER_ADMIN', 'ADMIN', 'OFFICE', 'ACCOUNTANT'].includes(user.role);

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => get<any[]>('/academic/sections'),
    enabled: canSeeAll,
  });

  const { data: strength } = useQuery({
    queryKey: ['strength'],
    queryFn: () => get<any>('/students/strength'),
    enabled: canSeeAll,
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', q, sectionId],
    queryFn: () => get<any[]>('/students', { q: q || undefined, sectionId: sectionId || undefined }),
  });

  return (
    <>
      <PageTitle title="Students" subtitle="Open a student to see attendance, assignments, marks and fees together." />

      {strength && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="On roll" value={strength.totals.students} />
          <Stat label="Sanctioned seats" value={strength.totals.capacity} />
          <Stat label="Sections" value={strength.totals.sections} />
          <Stat
            label="Vacant seats"
            value={strength.totals.capacity - strength.totals.students}
            tone="teal"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or admission number"
          className="max-w-[320px]"
        />
        {canSeeAll && (
          <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="max-w-[220px]">
            <option value="">All sections</option>
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>{s.classLevel.name} {s.name}</option>
            ))}
          </Select>
        )}
      </div>

      {strength && !sectionId && !q && (
        <Panel title="Class strength" className="mb-4">
          <Table head={['Class', 'Class teacher', 'Strength', 'Capacity', 'Vacant', 'Boys', 'Girls']}>
            {strength.rows.map((r: any) => (
              <tr key={r.sectionId}>
                <Td className="font-medium">{r.class} {r.section}</Td>
                <Td className={r.classTeacher ? '' : 'text-rose'}>
                  {r.classTeacher || 'not assigned'}
                </Td>
                <Td className="tabular">{r.strength}</Td>
                <Td className="tabular text-gray-500">{r.capacity}</Td>
                <Td className="tabular">
                  {r.isFull ? <Badge tone="absent">full</Badge> : r.vacant}
                </Td>
                <Td className="tabular">{r.male}</Td>
                <Td className="tabular">{r.female}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      <Panel title={students ? `${students.length} students` : 'Students'}>
        {isLoading ? (
          <Loading />
        ) : !students?.length ? (
          <Empty title="No students matched" hint="Try a different name or clear the filters." />
        ) : (
          <Table head={['Admission no', 'Name', 'Class', 'Roll', 'Guardian', 'Phone']}>
            {students.map((s: any) => {
              const e = s.enrollments?.[0];
              return (
                <tr key={s.id}>
                  <Td className="tabular text-gray-500">{s.admissionNo}</Td>
                  <Td>
                    <Link to={`/students/${s.id}`} className="font-medium text-ink hover:text-teal">
                      {s.firstName} {s.lastName}
                    </Link>
                  </Td>
                  <Td>{e ? `${e.section.classLevel.name} ${e.section.name}` : '—'}</Td>
                  <Td className="tabular">{e?.rollNo ?? '—'}</Td>
                  <Td className="text-gray-600">{s.guardians?.[0]?.name || '—'}</Td>
                  <Td className="tabular text-gray-600">{s.phone || '—'}</Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Panel>
    </>
  );
}
