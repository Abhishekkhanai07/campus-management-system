import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, timeAgo } from '../lib/format';
import {
  Badge, Button, Empty, Loading, Panel, PercentBar, Stat, Table, Td, PageTitle, statusTone,
} from '../components/ui';

export default function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<any>('/dashboard') });

  if (isLoading) return <Loading label="Loading your dashboard" />;
  if (!data) return <Empty title="Nothing to show yet" />;

  if (data.role === 'TEACHER') return <TeacherView d={data} />;
  if (data.role === 'STUDENT') return <StudentView d={data} name={user.name} />;
  if (data.role === 'PARENT') return <ParentView d={data} />;
  if (data.role === 'ACCOUNTANT') return <AccountantView d={data} />;
  return <AdminView d={data} />;
}

/* ---------------------------------------------------------------- admin */

function AdminView({ d }: { d: any }) {
  const attention = d.needsAttention || {};
  const items = [
    { n: attention.periodsNotMarked, label: 'periods without attendance today', to: '/attendance/reports' },
    { n: attention.pendingLeaveApprovals, label: 'leave applications waiting for you', to: '/leave' },
    { n: attention.pendingCorrections, label: 'attendance corrections to review', to: '/attendance/reports' },
    { n: attention.sectionsWithoutClassTeacher, label: 'sections without a class teacher', to: '/allocation' },
    { n: attention.attendanceDefaulters, label: 'students below the attendance minimum', to: '/attendance/reports' },
  ].filter((i) => i.n > 0);

  return (
    <>
      <PageTitle title="Today at a glance" subtitle={`Academic year ${d.academicYear}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Students on roll" value={d.cards.students} />
        <Stat label="Staff" value={d.cards.staff} hint={`${d.cards.sections} sections`} />
        <Stat
          label="Attendance today"
          value={`${d.attendanceToday.pct}%`}
          hint={`${d.attendanceToday.present} present of ${d.attendanceToday.marked} marked`}
          tone={d.attendanceToday.pct >= 85 ? 'grass' : 'amber'}
        />
        <Stat
          label="Fees collected today"
          value={money(d.feeToday.amount)}
          hint={`${d.feeToday.count} receipts`}
          tone="teal"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Panel title="Needs your attention" className="lg:col-span-2">
          {items.length === 0 ? (
            <Empty title="Nothing pending" hint="Attendance is marked, approvals are clear." />
          ) : (
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.label} className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[14px]">
                    <span className="font-semibold tabular text-ink">{i.n}</span>{' '}
                    <span className="text-gray-600">{i.label}</span>
                  </span>
                  <Link to={i.to}>
                    <Button variant="secondary" size="sm">Open</Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Teacher cover today" subtitle={`${d.substitutions.teachersAbsent} teachers on leave`}>
          <div className="p-4">
            <div className="flex items-end gap-6">
              <div>
                <div className="text-3xl font-semibold tabular text-ink">{d.substitutions.covered}</div>
                <div className="text-[12.5px] text-gray-500">periods covered</div>
              </div>
              <div>
                <div
                  className={`text-3xl font-semibold tabular ${
                    d.substitutions.needsCover ? 'text-rose' : 'text-grass'
                  }`}
                >
                  {d.substitutions.needsCover}
                </div>
                <div className="text-[12.5px] text-gray-500">still open</div>
              </div>
            </div>
            <Link to="/substitutions">
              <Button variant="secondary" size="sm" className="mt-4">Open substitution board</Button>
            </Link>
          </div>
        </Panel>
      </div>

      <Panel title="Recent activity" subtitle="Every action in the system is logged" className="mt-4">
        {d.recentActivity?.length ? (
          <ul className="divide-y divide-line">
            {d.recentActivity.map((a: any, i: number) => (
              <li key={i} className="px-4 py-2.5 flex items-center justify-between gap-4 text-[13.5px]">
                <span>
                  <span className="font-medium text-ink">{a.who}</span>{' '}
                  <span className="text-gray-500">
                    {a.action.replace(/_/g, ' ').toLowerCase()} in {a.module.toLowerCase()}
                  </span>
                </span>
                <span className="text-gray-400 text-[12.5px] whitespace-nowrap">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No activity yet today" />
        )}
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------------- teacher */

function TeacherView({ d }: { d: any }) {
  return (
    <>
      <PageTitle
        title={`Good day, ${d.name.split(' ')[0]}`}
        subtitle={`${d.cards.subjects} subjects · ${d.cards.sections} sections · ${d.cards.students} students`}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel
          title="Your periods today"
          subtitle={`${d.needsAttention.attendancePending} still need attendance`}
          className="lg:col-span-2"
        >
          {d.todaySlots.length === 0 ? (
            <Empty title="No classes scheduled today" hint="Enjoy the breathing room." />
          ) : (
            <ul className="divide-y divide-line">
              {d.todaySlots.map((s: any) => (
                <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-ink">
                      {s.subject} · {s.section}
                    </div>
                    <div className="text-[12.5px] text-gray-500 tabular">
                      Period {s.periodNo} · {s.startTime}–{s.endTime}
                      {s.room ? ` · ${s.room}` : ''}
                    </div>
                  </div>
                  {s.attendanceMarked ? (
                    <Badge tone="present">Marked</Badge>
                  ) : (
                    <Link to={`/attendance?slotId=${s.id}`}>
                      <Button size="sm">Take attendance</Button>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          {d.substitutionDuties.length > 0 && (
            <Panel title="You are covering" subtitle="Periods assigned to you today">
              <ul className="divide-y divide-line">
                {d.substitutionDuties.map((s: any) => (
                  <li key={s.id} className="px-4 py-2.5">
                    <div className="text-[13.5px] font-medium">{s.subject} · {s.section}</div>
                    <div className="text-[12.5px] text-gray-500 tabular">Period {s.periodNo} · {s.time}</div>
                    <Link to={`/attendance?slotId=${s.slotId}`} className="text-[12.5px] text-teal">
                      Take attendance
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Your class">
            {d.classTeacherOf.length === 0 ? (
              <Empty title="You are not a class teacher" hint="Only subject periods are yours to mark." />
            ) : (
              <ul className="divide-y divide-line">
                {d.classTeacherOf.map((c: any) => (
                  <li key={c.sectionId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-medium">{c.section}</div>
                      <div className="text-[12.5px] text-gray-500">{c.students} students</div>
                    </div>
                    <Link to={`/attendance?sectionId=${c.sectionId}`}>
                      <Button size="sm" variant="secondary">Register</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Leave balance">
            <ul className="px-4 py-3 space-y-1.5">
              {d.leaveBalances.map((b: any) => (
                <li key={b.type} className="flex justify-between text-[13.5px]">
                  <span className="text-gray-600">{b.type}</span>
                  <span className="tabular font-medium">{b.remaining} / {b.total}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {(d.needsAttention.assignmentsToEvaluate > 0 || d.needsAttention.studentLeaveRequests > 0) && (
        <Panel title="Waiting on you" className="mt-4">
          <ul className="divide-y divide-line">
            {d.needsAttention.assignmentsToEvaluate > 0 && (
              <li className="px-4 py-3 flex items-center justify-between">
                <span className="text-[14px]">
                  <span className="font-semibold tabular">{d.needsAttention.assignmentsToEvaluate}</span>{' '}
                  <span className="text-gray-600">submissions to evaluate</span>
                </span>
                <Link to="/assignments"><Button size="sm" variant="secondary">Open</Button></Link>
              </li>
            )}
            {d.needsAttention.studentLeaveRequests > 0 && (
              <li className="px-4 py-3 flex items-center justify-between">
                <span className="text-[14px]">
                  <span className="font-semibold tabular">{d.needsAttention.studentLeaveRequests}</span>{' '}
                  <span className="text-gray-600">student leave requests</span>
                </span>
                <Link to="/leave"><Button size="sm" variant="secondary">Open</Button></Link>
              </li>
            )}
          </ul>
        </Panel>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- student */

export function StudentView({ d, name }: { d: any; name?: string }) {
  return (
    <>
      <PageTitle
        title={name ? `Hello, ${name.split(' ')[0]}` : 'Overview'}
        subtitle={d.section ? `${d.section} · class teacher ${d.classTeacher || 'not assigned'}` : ''}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Attendance"
          value={`${d.attendance.pct}%`}
          hint={`minimum ${d.attendance.minRequired}%`}
          tone={d.attendance.isDefaulter ? 'rose' : 'grass'}
        />
        <Stat label="Assignments pending" value={d.pendingAssignments.length} tone={d.pendingAssignments.length ? 'amber' : 'default'} />
        <Stat
          label="Last result"
          value={d.lastResult ? `${d.lastResult.percentage}%` : '—'}
          hint={d.lastResult ? `${d.lastResult.exam} · rank ${d.lastResult.rank}` : 'not published yet'}
        />
        <Stat label="Fee balance" value={money(d.fees.balance)} tone={d.fees.balance > 0 ? 'amber' : 'grass'} />
      </div>

      {d.attendance.isDefaulter && (
        <div className="mt-4 border border-rose/25 bg-rose-light text-rose rounded-md px-4 py-3 text-[13.5px]">
          Your attendance is below the {d.attendance.minRequired}% needed to appear for exams. Speak to your class teacher.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Panel title="Today's timetable">
          {d.timetableToday.length === 0 ? (
            <Empty title="No classes today" />
          ) : (
            <Table head={['Period', 'Subject', 'Teacher']}>
              {d.timetableToday.map((s: any) => (
                <tr key={s.periodNo}>
                  <Td className="tabular whitespace-nowrap">{s.periodNo} · {s.time}</Td>
                  <Td>{s.subject}</Td>
                  <Td className={s.isSubstituted ? 'text-amber' : ''}>{s.teacher}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel title="Pending assignments">
          {d.pendingAssignments.length === 0 ? (
            <Empty title="Everything submitted" hint="Nothing is due right now." />
          ) : (
            <Table head={['Assignment', 'Subject', 'Due']}>
              {d.pendingAssignments.map((a: any) => (
                <tr key={a.id}>
                  <Td>{a.title}</Td>
                  <Td>{a.subject}</Td>
                  <Td>
                    <Badge tone={a.isOverdue ? 'absent' : 'pending'}>
                      {new Date(a.dueDate).toLocaleDateString('en-IN')}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>

      <Panel title="Subject-wise attendance" className="mt-4">
        {d.attendance.bySubject?.length ? (
          <Table head={['Subject', 'Periods held', 'Attended', 'Percentage']}>
            {d.attendance.bySubject.map((s: any) => (
              <tr key={s.subject}>
                <Td>{s.subject}</Td>
                <Td className="tabular">{s.held}</Td>
                <Td className="tabular">{s.present}</Td>
                <Td><PercentBar value={s.pct} min={d.attendance.minRequired} /></Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty title="No period attendance recorded yet" />
        )}
      </Panel>

      {d.notices?.length > 0 && (
        <Panel title="Notices" className="mt-4">
          <ul className="divide-y divide-line">
            {d.notices.slice(0, 4).map((n: any) => (
              <li key={n.id} className="px-4 py-3">
                <div className="text-[14px] font-medium text-ink">{n.title}</div>
                <div className="text-[13px] text-gray-600 mt-0.5">{n.body}</div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- parent */

function ParentView({ d }: { d: any }) {
  if (!d.children?.length) return <Empty title="No student is linked to this login" />;
  return (
    <>
      {d.children.map((c: any) => (
        <div key={c.studentId} className="mb-8">
          <StudentView d={c} name={c.name} />
        </div>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- accounts */

function AccountantView({ d }: { d: any }) {
  return (
    <>
      <PageTitle title="Fee collection" subtitle="Today and this month" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Collected today" value={money(d.cards.collectedToday)} tone="grass" />
        <Stat label="Receipts today" value={d.cards.receiptsToday} />
        <Stat label="Collected this month" value={money(d.cards.collectedThisMonth)} tone="teal" />
        <Stat label="Outstanding dues" value={money(d.cards.pendingDues)} tone="rose" />
      </div>

      <Panel title="Today's receipts" className="mt-4">
        {d.recentReceipts?.length ? (
          <Table head={['Receipt', 'Amount', 'Mode', 'Time']}>
            {d.recentReceipts.map((r: any) => (
              <tr key={r.id}>
                <Td className="tabular">{r.receiptNo}</Td>
                <Td className="tabular">{money(r.amount)}</Td>
                <Td><Badge tone={statusTone('info')}>{r.mode}</Badge></Td>
                <Td className="text-gray-500">{timeAgo(r.paidAt)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty title="No collection yet today" hint="Receipts appear here as they are issued." />
        )}
      </Panel>
    </>
  );
}
