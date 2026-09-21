import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Empty, Loading, Panel, Select, PageTitle } from '../components/ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Timetable() {
  const user = useAuth((s) => s.user)!;
  const [sectionId, setSectionId] = useState('');

  const isStaff = ['TEACHER', 'HOD'].includes(user.role);

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => get<any[]>('/academic/sections'),
    enabled: !['STUDENT', 'PARENT'].includes(user.role),
  });

  const { data: slots, isLoading } = useQuery({
    queryKey: ['timetable', sectionId, user.staffId],
    queryFn: () =>
      get<any[]>('/academic/timetable', {
        sectionId: sectionId || undefined,
        staffId: !sectionId && isStaff ? user.staffId : undefined,
      }),
  });

  const periods = Array.from(new Set((slots || []).map((s: any) => s.periodNo))).sort((a, b) => a - b);

  return (
    <>
      <PageTitle
        title="Timetable"
        subtitle={sectionId ? 'Class timetable' : isStaff ? 'Your weekly periods' : 'Choose a class'}
        action={
          sections && (
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="max-w-[240px]">
              <option value="">{isStaff ? 'My timetable' : 'Choose a class'}</option>
              {sections.map((s: any) => (
                <option key={s.id} value={s.id}>{s.classLevel.name} {s.name}</option>
              ))}
            </Select>
          )
        }
      />

      {isLoading ? (
        <Loading />
      ) : !slots?.length ? (
        <Empty title="No timetable yet" hint="Periods appear here once the timetable is entered." />
      ) : (
        <Panel>
          <div className="scroll-x">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-gray-500">
                  <th className="text-left font-medium px-4 py-2.5">Day</th>
                  {periods.map((p) => (
                    <th key={p} className="font-medium px-3 py-2.5 tabular">Period {p}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {DAYS.map((day, i) => {
                  const wd = i + 1;
                  const daySlots = (slots as any[]).filter((s) => s.weekday === wd);
                  if (!daySlots.length) return null;
                  return (
                    <tr key={day}>
                      <td className="px-4 py-2 font-medium whitespace-nowrap">{day}</td>
                      {periods.map((p) => {
                        const slot = daySlots.find((s) => s.periodNo === p);
                        return (
                          <td key={p} className="px-3 py-2 align-top">
                            {slot ? (
                              <div className="border border-line rounded-md px-2 py-1.5 bg-canvas">
                                <div className="font-medium text-ink">{slot.subject.name}</div>
                                <div className="text-[12px] text-gray-500">
                                  {sectionId
                                    ? `${slot.staff.firstName} ${slot.staff.lastName}`
                                    : `${slot.section.classLevel.name} ${slot.section.name}`}
                                </div>
                                <div className="text-[11.5px] text-gray-400 tabular">
                                  {slot.startTime}–{slot.endTime}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
