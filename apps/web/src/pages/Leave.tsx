import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dateIn, todayIso } from '../lib/format';
import {
  Badge, Button, Empty, ErrorNote, Field, Input, Loading, Note, Panel, Select, Table, Td,
  PageTitle, statusTone,
} from '../components/ui';

export default function Leave() {
  const user = useAuth((s) => s.user)!;
  const isApprover = ['SUPER_ADMIN', 'ADMIN', 'HOD'].includes(user.role);
  const [tab, setTab] = useState<'mine' | 'approvals'>(isApprover ? 'approvals' : 'mine');

  return (
    <>
      <PageTitle
        title="Leave"
        subtitle="Applying for leave shows the approver exactly which periods will be left uncovered."
      />

      {isApprover && (
        <div className="flex gap-2 mb-4">
          {([['approvals', 'For approval'], ['mine', 'My leave']] as const).map(([k, l]) => (
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
      )}

      {tab === 'approvals' ? <Approvals /> : <MyLeave />}
    </>
  );
}

/* ---------------------------------------------------------------- apply */

function MyLeave() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [impact, setImpact] = useState<any>(null);
  const [form, setForm] = useState({
    leaveTypeId: '',
    fromDate: todayIso(),
    toDate: todayIso(),
    reason: '',
  });

  const { data: types } = useQuery({ queryKey: ['leave-types'], queryFn: () => get<any[]>('/leaves/types') });
  const { data: balances } = useQuery({ queryKey: ['leave-balances'], queryFn: () => get<any[]>('/leaves/balances') });
  const { data: mine, isLoading } = useQuery({ queryKey: ['my-leaves'], queryFn: () => get<any[]>('/leaves/mine') });

  const apply = useMutation({
    mutationFn: () => post<any>('/leaves', form),
    onSuccess: (res) => {
      setImpact(res.impact);
      setError('');
      setForm((f) => ({ ...f, reason: '' }));
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-4 items-start">
      <Panel title="Apply for leave">
        <form
          className="p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            apply.mutate();
          }}
        >
          <Field label="Type">
            <Select
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              required
            >
              <option value="">Choose</option>
              {types?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} required />
            </Field>
            <Field label="To">
              <Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} required />
            </Field>
          </div>

          <Field label="Reason">
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required placeholder="Short reason for the record" />
          </Field>

          {error && <ErrorNote text={error} />}
          {impact && (
            <Note>
              Applied. {impact.periods} of your periods and {impact.studentsAffected} students are affected —
              the approver will arrange cover.
            </Note>
          )}

          <Button type="submit" disabled={apply.isPending}>
            {apply.isPending ? 'Sending…' : 'Apply'}
          </Button>
        </form>

        {balances?.length ? (
          <div className="border-t border-line px-4 py-3">
            <p className="text-[12.5px] text-gray-500 mb-2">Balance this year</p>
            <ul className="space-y-1">
              {balances.map((b: any) => (
                <li key={b.id} className="flex justify-between text-[13.5px]">
                  <span className="text-gray-600">{b.leaveType.name}</span>
                  <span className="tabular font-medium">{b.opening - b.availed} / {b.opening}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>

      <Panel title="Your applications">
        {isLoading ? (
          <Loading />
        ) : !mine?.length ? (
          <Empty title="No leave applied yet" />
        ) : (
          <Table head={['Type', 'From', 'To', 'Reason', 'Status', 'Cover arranged']}>
            {mine.map((l: any) => (
              <tr key={l.id}>
                <Td>{l.leaveType.name}</Td>
                <Td className="tabular">{dateIn(l.fromDate)}</Td>
                <Td className="tabular">{dateIn(l.toDate)}</Td>
                <Td className="text-gray-600 max-w-[220px] truncate">{l.reason}</Td>
                <Td><Badge tone={statusTone(l.status)}>{l.status.toLowerCase()}</Badge></Td>
                <Td className="tabular">
                  {l.substitutions?.length
                    ? `${l.substitutions.filter((s: any) => s.substituteStaff).length} of ${l.substitutions.length}`
                    : '—'}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- approve */

function Approvals() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['pending-leaves'], queryFn: () => get<any[]>('/leaves/pending') });
  const { data: studentLeaves } = useQuery({
    queryKey: ['pending-student-leaves'],
    queryFn: () => get<any[]>('/students/leaves/pending'),
  });

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      patch<any>(`/leaves/${id}/decision`, { approve }),
    onSuccess: (res: any) => {
      setError('');
      qc.invalidateQueries({ queryKey: ['pending-leaves'] });
      qc.invalidateQueries({ queryKey: ['sub-board'] });
      if (res.substitutionsCreated)
        setError(`Approved. ${res.substitutionsCreated} periods now need cover — open the substitution board.`);
    },
    onError: (e) => setError(errorText(e)),
  });

  const decideStudent = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      patch(`/students/leaves/${id}/decision`, { approve }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-student-leaves'] }),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      {error && <Note>{error}</Note>}

      <Panel title="Staff leave" subtitle="Approving generates the cover list automatically">
        {!data?.length ? (
          <Empty title="No leave waiting" hint="Applications appear here the moment a teacher applies." />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((l: any) => (
              <li key={l.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[14.5px] font-medium text-ink">
                      {l.staff.firstName} {l.staff.lastName}
                      <span className="text-gray-400 font-normal"> · {l.leaveType.name}</span>
                    </div>
                    <div className="text-[13px] text-gray-500 tabular">
                      {dateIn(l.fromDate)} to {dateIn(l.toDate)} · {l.reason}
                    </div>
                    <button
                      onClick={() => setOpenId(openId === l.id ? null : l.id)}
                      className="text-[12.5px] text-teal mt-1"
                    >
                      {l.impact.periods} periods affected, {l.impact.studentsAffected} students —{' '}
                      {openId === l.id ? 'hide' : 'see which'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => decide.mutate({ id: l.id, approve: false })}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => decide.mutate({ id: l.id, approve: true })}>
                      Approve
                    </Button>
                  </div>
                </div>

                {openId === l.id && (
                  <div className="mt-3 border border-line rounded-md bg-canvas">
                    <Table head={['Date', 'Period', 'Class', 'Subject', 'Students']}>
                      {l.impact.rows.map((r: any, i: number) => (
                        <tr key={i}>
                          <Td className="tabular">{dateIn(r.date)}</Td>
                          <Td className="tabular">{r.periodNo} · {r.time}</Td>
                          <Td>{r.section}</Td>
                          <Td>{r.subject}</Td>
                          <Td className="tabular">{r.students}</Td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Student leave">
        {!studentLeaves?.length ? (
          <Empty title="No student leave requests" />
        ) : (
          <Table head={['Student', 'From', 'To', 'Reason', '']}>
            {studentLeaves.map((l: any) => (
              <tr key={l.id}>
                <Td>{l.student.firstName} {l.student.lastName}</Td>
                <Td className="tabular">{dateIn(l.fromDate)}</Td>
                <Td className="tabular">{dateIn(l.toDate)}</Td>
                <Td className="text-gray-600">{l.reason}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => decideStudent.mutate({ id: l.id, approve: false })}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => decideStudent.mutate({ id: l.id, approve: true })}>
                      Approve
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
