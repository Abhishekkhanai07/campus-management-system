import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { money, dateIn } from '../lib/format';
import {
  Badge, Empty, Loading, Panel, PercentBar, Stat, Table, Td, PageTitle, statusTone,
} from '../components/ui';

type Tab = 'attendance' | 'assignments' | 'exams' | 'fees';

export default function StudentProfile() {
  const { id } = useParams();
  const [tab, setTab] = useState<Tab>('attendance');

  const { data, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => get<any>(`/students/${id}`),
  });

  if (isLoading) return <Loading />;
  if (!data) return <Empty title="Student not found" />;

  const s = data.student;
  const e = data.enrollment;

  return (
    <>
      <PageTitle
        title={`${s.firstName} ${s.lastName}`}
        subtitle={`${s.admissionNo}${e ? ` · ${e.section.classLevel.name} ${e.section.name} · roll ${e.rollNo ?? '—'}` : ''}`}
        action={<Link to="/students" className="text-[13.5px] text-teal">Back to students</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Attendance"
          value={`${data.attendance.overallPct}%`}
          hint={`${data.attendance.presentDays} of ${data.attendance.totalDays} days`}
          tone={data.attendance.isDefaulter ? 'rose' : 'grass'}
        />
        <Stat
          label="Assignments pending"
          value={data.assignments.pending}
          hint={`${data.assignments.submitted} submitted`}
          tone={data.assignments.pending ? 'amber' : 'default'}
        />
        <Stat label="Fee balance" value={money(data.fees.balance)} tone={data.fees.balance > 0 ? 'amber' : 'grass'} />
        <Stat label="Guardian" value={<span className="text-[15px]">{s.guardians?.[0]?.name || '—'}</span>} hint={s.guardians?.[0]?.phone} />
      </div>

      <div className="flex flex-wrap gap-2 my-4">
        {([
          ['attendance', 'Attendance'],
          ['assignments', 'Assignments'],
          ['exams', 'Marks'],
          ['fees', 'Fees'],
        ] as [Tab, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-md text-[13.5px] border ${
              tab === k ? 'bg-ink text-white border-ink' : 'bg-white border-line text-gray-600 hover:border-teal'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Subject-wise" subtitle={`Minimum required ${data.attendance.minRequired}%`}>
            {data.attendance.bySubject.length === 0 ? (
              <Empty title="No period attendance recorded" />
            ) : (
              <Table head={['Subject', 'Held', 'Attended', 'Percentage']}>
                {data.attendance.bySubject.map((r: any) => (
                  <tr key={r.subject}>
                    <Td>{r.subject}</Td>
                    <Td className="tabular">{r.held}</Td>
                    <Td className="tabular">{r.present}</Td>
                    <Td><PercentBar value={r.pct} min={data.attendance.minRequired} /></Td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>

          <Panel title="Last 60 days">
            <div className="p-4 flex flex-wrap gap-1">
              {data.attendance.recent.map((d: any) => (
                <span
                  key={d.date}
                  title={`${d.date} · ${d.status.toLowerCase()}`}
                  className={`w-5 h-5 rounded-sm ${
                    d.status === 'ABSENT'
                      ? 'bg-rose'
                      : d.status === 'ON_LEAVE'
                      ? 'bg-gray-300'
                      : d.status === 'LATE'
                      ? 'bg-amber'
                      : 'bg-grass'
                  }`}
                />
              ))}
            </div>
            <div className="px-4 pb-4 flex gap-4 text-[12.5px] text-gray-500">
              <span><span className="inline-block w-2.5 h-2.5 bg-grass rounded-sm mr-1" />present</span>
              <span><span className="inline-block w-2.5 h-2.5 bg-rose rounded-sm mr-1" />absent</span>
              <span><span className="inline-block w-2.5 h-2.5 bg-amber rounded-sm mr-1" />late</span>
              <span><span className="inline-block w-2.5 h-2.5 bg-gray-300 rounded-sm mr-1" />leave</span>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'assignments' && (
        <Panel title="Assignments" subtitle={`${data.assignments.late} submitted late`}>
          {data.assignments.items.length === 0 ? (
            <Empty title="No assignments yet" />
          ) : (
            <Table head={['Assignment', 'Subject', 'Due', 'Status', 'Marks']}>
              {data.assignments.items.map((a: any) => (
                <tr key={a.id}>
                  <Td>{a.title}</Td>
                  <Td>{a.subject}</Td>
                  <Td className="tabular">{dateIn(a.dueDate)}</Td>
                  <Td>
                    <Badge tone={statusTone(a.status)}>{a.status.toLowerCase()}</Badge>
                    {a.isLate && <span className="text-[12px] text-amber ml-1">late</span>}
                  </Td>
                  <Td className="tabular">{a.marks != null ? `${a.marks}/${a.maxMarks}` : '—'}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      )}

      {tab === 'exams' && (
        <Panel title="Marks" subtitle="Only published results are shown">
          {data.exams.length === 0 ? (
            <Empty title="No marks recorded yet" />
          ) : (
            <Table head={['Exam', 'Subject', 'Marks', 'Status']}>
              {data.exams.map((m: any, i: number) => (
                <tr key={i}>
                  <Td>{m.exam}</Td>
                  <Td>{m.subject}</Td>
                  <Td className="tabular">
                    {m.marks != null ? `${m.marks} / ${m.maxMarks}` : <span className="text-gray-400">not published</span>}
                  </Td>
                  <Td><Badge tone={statusTone(m.examStatus)}>{m.examStatus.toLowerCase().replace('_', ' ')}</Badge></Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      )}

      {tab === 'fees' && (
        <Panel title="Fees" subtitle={`Paid ${money(data.fees.paid)} of ${money(data.fees.total)}`}>
          {data.fees.structures.length === 0 ? (
            <Empty title="No fee assigned" />
          ) : (
            <div className="divide-y divide-line">
              {data.fees.structures.map((f: any) => (
                <div key={f.id} className="px-4 py-3">
                  <div className="flex justify-between text-[14px]">
                    <span className="font-medium">{f.feeStructure.name}</span>
                    <span className="tabular">{money(f.netPayable)}</span>
                  </div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    {f.installments.map((i: any) => (
                      <div key={i.id} className="border border-line rounded-md px-3 py-2 text-[13px] flex justify-between">
                        <span className="text-gray-600">Installment {i.seq} · due {dateIn(i.dueDate)}</span>
                        <span className="tabular">{money(i.paidAmount)} / {money(i.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
