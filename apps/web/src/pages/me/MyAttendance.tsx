import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import {
  Empty, Loading, Panel, PercentBar, Stat, Table, Td, PageTitle,
} from '../../components/ui';

export default function MyAttendance() {
  const { data, isLoading } = useQuery({ queryKey: ['my-attendance'], queryFn: () => get<any>('/attendance/me') });

  if (isLoading) return <Loading />;
  if (!data) return <Empty title="No attendance recorded yet" />;

  const short = data.overallPct < data.minRequired;

  return (
    <>
      <PageTitle title="My attendance" subtitle="Day register and subject-wise record." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Overall" value={`${data.overallPct}%`} tone={short ? 'rose' : 'grass'} hint={`minimum ${data.minRequired}%`} />
        <Stat label="Days held" value={data.totalDays} />
        <Stat label="Present" value={data.presentDays} tone="grass" />
        <Stat label="Absent" value={data.absentDays} tone={data.absentDays ? 'rose' : 'default'} />
      </div>

      {short && (
        <div className="mt-4 border border-rose/25 bg-rose-light text-rose rounded-md px-4 py-3 text-[13.5px]">
          You are below the {data.minRequired}% attendance needed to appear for exams. Speak to your class teacher.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Panel title="Subject-wise">
          {!data.bySubject.length ? (
            <Empty title="No period attendance recorded" />
          ) : (
            <Table head={['Subject', 'Held', 'Attended', 'Percentage']}>
              {data.bySubject.map((s: any) => (
                <tr key={s.subject}>
                  <Td>{s.subject}</Td>
                  <Td className="tabular">{s.held}</Td>
                  <Td className="tabular">{s.present}</Td>
                  <Td><PercentBar value={s.pct} min={data.minRequired} /></Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel title="Day by day">
          <div className="p-4 flex flex-wrap gap-1">
            {data.calendar.slice(0, 90).map((d: any) => (
              <span
                key={d.date}
                title={`${d.date} · ${d.status.toLowerCase()}`}
                className={`w-5 h-5 rounded-sm ${
                  d.status === 'ABSENT' ? 'bg-rose'
                  : d.status === 'ON_LEAVE' ? 'bg-gray-300'
                  : d.status === 'LATE' ? 'bg-amber'
                  : 'bg-grass'
                }`}
              />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
