import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { todayIso } from '../lib/format';
import {
  Badge, Button, Empty, ErrorNote, Loading, Panel, Stat, Table, Td, PageTitle,
} from '../components/ui';

export default function Substitutions() {
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState('');

  const canAssign = ['SUPER_ADMIN', 'ADMIN', 'HOD'].includes(user.role);

  const { data, isLoading } = useQuery({
    queryKey: ['sub-board', date],
    queryFn: () => get<any>('/leaves/substitutions/board', { date }),
  });

  const assign = useMutation({
    mutationFn: ({ id, staffId }: { id: string; staffId: string }) =>
      patch(`/leaves/substitutions/${id}`, { substituteStaffId: staffId, status: 'ASSIGNED' }),
    onSuccess: () => {
      setPicking(null);
      setError('');
      qc.invalidateQueries({ queryKey: ['sub-board'] });
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <>
      <PageTitle
        title="Teacher cover"
        subtitle="Periods left uncovered when a teacher is on leave, and who is taking them."
        action={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-line rounded-md px-3 py-2 text-[14px] bg-white"
          />
        }
      />

      {isLoading && <Loading />}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Periods affected" value={data.summary.total} />
            <Stat label="Covered" value={data.summary.covered} tone="grass" />
            <Stat label="Still open" value={data.summary.needsCover} tone={data.summary.needsCover ? 'rose' : 'grass'} />
          </div>

          {error && <div className="mb-4"><ErrorNote text={error} /></div>}

          <Panel title={`Cover for ${data.date}`}>
            {data.rows.length === 0 ? (
              <Empty
                title="No cover needed"
                hint="No approved teacher leave falls on this date."
              />
            ) : (
              <Table head={['Period', 'Class', 'Subject', 'Teacher on leave', 'Cover', canAssign ? '' : 'Status']}>
                {data.rows.map((r: any) => (
                  <Fragment key={r.id}>
                    <tr>
                      <Td className="tabular whitespace-nowrap">{r.periodNo} · {r.time}</Td>
                      <Td>
                        {r.section}
                        <span className="text-gray-400 text-[12px] ml-1">({r.students})</span>
                      </Td>
                      <Td>{r.subject}</Td>
                      <Td className="text-gray-600">{r.absentTeacher}</Td>
                      <Td>
                        {r.substitute ? (
                          <span className="font-medium text-ink">{r.substitute}</span>
                        ) : (
                          <Badge tone="absent">Not covered</Badge>
                        )}
                      </Td>
                      <Td>
                        {canAssign ? (
                          <Button
                            size="sm"
                            variant={r.substitute ? 'secondary' : 'primary'}
                            onClick={() => setPicking(picking === r.id ? null : r.id)}
                          >
                            {r.substitute ? 'Change' : 'Find cover'}
                          </Button>
                        ) : (
                          <Badge tone={r.substitute ? 'present' : 'pending'}>{r.status.replace('_', ' ')}</Badge>
                        )}
                      </Td>
                    </tr>
                    {picking === r.id && (
                      <tr>
                        <Td colSpan={6} className="bg-canvas">
                          <Suggestions
                            substitutionId={r.id}
                            onPick={(staffId) => assign.mutate({ id: r.id, staffId })}
                            busy={assign.isPending}
                          />
                        </Td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </Table>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

function Suggestions({
  substitutionId,
  onPick,
  busy,
}: {
  substitutionId: string;
  onPick: (staffId: string) => void;
  busy: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['sub-suggestions', substitutionId],
    queryFn: () => get<any>(`/leaves/substitutions/${substitutionId}/suggestions`),
  });

  if (isLoading) return <Loading label="Finding free teachers" />;
  if (!data?.candidates?.length)
    return (
      <Empty
        title="No teacher is free this period"
        hint="Consider combining the class with another section, or marking the period as a library period."
      />
    );

  return (
    <div className="py-2">
      <p className="text-[12.5px] text-gray-500 mb-2">
        Free this period, best match first. A teacher who already teaches the subject is ranked highest.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.candidates.map((c: any) => (
          <button
            key={c.staffId}
            disabled={busy}
            onClick={() => onPick(c.staffId)}
            className="text-left border border-line bg-white rounded-md px-3 py-2 hover:border-teal disabled:opacity-60"
          >
            <div className="text-[13.5px] font-medium text-ink">{c.name}</div>
            <div className="text-[12px] text-gray-500">{c.reason}</div>
            <div className="text-[11.5px] text-gray-400 mt-0.5 tabular">
              {c.substitutionsLast7Days} cover periods in the last 7 days
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
