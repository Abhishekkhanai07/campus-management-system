import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { todayIso } from '../lib/format';
import {
  Badge, Empty, Loading, Panel, PercentBar, Select, Stat, Table, Td, PageTitle,
} from '../components/ui';

type Tab = 'defaulters' | 'register' | 'not-marked';

export default function AttendanceReports() {
  const [tab, setTab] = useState<Tab>('defaulters');
  const [sectionId, setSectionId] = useState('');
  const [month, setMonth] = useState(todayIso().slice(0, 7));

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => get<any[]>('/academic/sections'),
  });

  return (
    <>
      <PageTitle title="Attendance reports" subtitle="Who is short, what the month looks like, what is still unmarked." />

      <div className="flex flex-wrap gap-2 mb-4">
        {([
          ['defaulters', 'Short attendance'],
          ['register', 'Monthly register'],
          ['not-marked', 'Periods not marked'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-md text-[13.5px] border ${
              tab === key ? 'bg-ink text-white border-ink' : 'bg-white border-line text-gray-600 hover:border-teal'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== 'not-marked' && (
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="max-w-[240px]">
            <option value="">All sections</option>
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>{s.classLevel.name} {s.name}</option>
            ))}
          </Select>
          {tab === 'register' && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-line rounded-md px-3 py-2 text-[14px] bg-white"
            />
          )}
        </div>
      )}

      {tab === 'defaulters' && <Defaulters sectionId={sectionId} />}
      {tab === 'register' && <Register sectionId={sectionId} month={month} />}
      {tab === 'not-marked' && <NotMarked />}
    </>
  );
}

function Defaulters({ sectionId }: { sectionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['defaulters', sectionId],
    queryFn: () => get<any>('/attendance/report/defaulters', { sectionId: sectionId || undefined }),
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Stat label="Students below minimum" value={data.count} tone={data.count ? 'rose' : 'grass'} />
        <Stat label="Minimum required" value={`${data.minRequired}%`} />
      </div>

      <Panel title="Short attendance" subtitle="Lowest first. These students may be blocked from exams.">
        {data.rows.length === 0 ? (
          <Empty title="Nobody is short" hint="Every student is above the minimum." />
        ) : (
          <Table head={['Student', 'Admission no', 'Section', 'Days held', 'Attended', 'Percentage']}>
            {data.rows.map((r: any) => (
              <tr key={r.studentId}>
                <Td>
                  <Link to={`/students/${r.studentId}`} className="text-ink hover:text-teal font-medium">
                    {r.name}
                  </Link>
                </Td>
                <Td className="tabular text-gray-500">{r.admissionNo}</Td>
                <Td>{r.section}</Td>
                <Td className="tabular">{r.held}</Td>
                <Td className="tabular">{r.present}</Td>
                <Td><PercentBar value={r.pct} min={data.minRequired} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}

const CODE: Record<string, { c: string; t: string }> = {
  PRESENT: { c: 'text-grass', t: 'P' },
  ABSENT: { c: 'text-rose font-semibold', t: 'A' },
  LATE: { c: 'text-amber', t: 'L' },
  ON_LEAVE: { c: 'text-gray-400', t: 'CL' },
  HALF_DAY: { c: 'text-amber', t: 'H' },
  ON_DUTY: { c: 'text-teal', t: 'OD' },
};

function Register({ sectionId, month }: { sectionId: string; month: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['register', sectionId, month],
    queryFn: () => get<any>('/attendance/report/register', { sectionId, month }),
    enabled: !!sectionId,
  });

  if (!sectionId) return <Empty title="Choose a section" hint="The register is printed one section at a time." />;
  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <Panel title={`Register for ${month}`} subtitle="P present · A absent · L late · CL leave">
      <div className="scroll-x">
        <table className="text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left font-medium text-gray-500 px-3 py-2 sticky left-0 bg-white">Student</th>
              {data.days.map((d: string) => (
                <th
                  key={d}
                  className={`font-medium px-1.5 py-2 tabular ${
                    data.holidays.includes(d) ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {d.slice(8)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.rows.map((r: any) => (
              <tr key={r.studentId}>
                <td className="px-3 py-1.5 whitespace-nowrap sticky left-0 bg-white">
                  <span className="tabular text-gray-400 mr-2">{r.rollNo}</span>
                  {r.name}
                </td>
                {r.marks.map((m: string | null, i: number) => (
                  <td key={i} className={`text-center px-1.5 py-1.5 tabular ${m ? CODE[m]?.c : 'text-gray-200'}`}>
                    {m ? CODE[m]?.t : '·'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function NotMarked() {
  const [date, setDate] = useState(todayIso());
  const { data, isLoading } = useQuery({
    queryKey: ['not-marked', date],
    queryFn: () => get<any>('/attendance/report/not-marked', { date }),
  });

  return (
    <>
      <input
        type="date"
        value={date}
        max={todayIso()}
        onChange={(e) => setDate(e.target.value)}
        className="border border-line rounded-md px-3 py-2 text-[14px] bg-white mb-4"
      />
      {isLoading ? (
        <Loading />
      ) : (
        <Panel
          title="Periods without attendance"
          subtitle={data?.rows.length ? 'Follow up with these teachers' : undefined}
        >
          {!data?.rows.length ? (
            <Empty title="Every period is marked" hint="Nothing pending for this date." />
          ) : (
            <Table head={['Period', 'Section', 'Subject', 'Teacher']}>
              {data.rows.map((r: any) => (
                <tr key={r.slotId}>
                  <Td className="tabular whitespace-nowrap">{r.periodNo} · {r.time}</Td>
                  <Td>{r.section}</Td>
                  <Td>{r.subject}</Td>
                  <Td>
                    {r.teacher} <Badge tone="pending">not marked</Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      )}
    </>
  );
}
