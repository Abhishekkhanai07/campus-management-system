import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { timeAgo } from '../lib/format';
import { Badge, Empty, Loading, Panel, Select, Stat, Table, Td, PageTitle, Button } from '../components/ui';

const MODULES = ['AUTH', 'ATTENDANCE', 'LEAVE', 'SUBSTITUTION', 'ASSIGNMENT', 'EXAM', 'FEES', 'STUDENT', 'STAFF', 'SETUP', 'USER', 'NOTICE'];

export default function AuditLog() {
  const [module, setModule] = useState('');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', module, sensitiveOnly, page],
    queryFn: () =>
      get<any>('/audit', {
        module: module || undefined,
        sensitiveOnly: sensitiveOnly ? 'true' : undefined,
        page,
      }),
  });

  const { data: stats } = useQuery({ queryKey: ['audit-stats'], queryFn: () => get<any>('/audit/stats') });

  return (
    <>
      <PageTitle
        title="Activity log"
        subtitle="Every change is recorded with the user, the time and what changed. Nothing here can be edited or deleted."
      />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Logins this week" value={stats.loginsLast7Days} />
          <Stat label="Busiest module" value={stats.byModule.sort((a: any, b: any) => b.count - a.count)[0]?.module || '—'} />
          <Stat label="Most active user" value={<span className="text-[15px]">{stats.topUsers[0]?.user || '—'}</span>} hint={`${stats.topUsers[0]?.count || 0} actions`} />
          <Stat label="Records on this page" value={data?.rows.length || 0} />
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className="max-w-[220px]">
          <option value="">All modules</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>{m.toLowerCase()}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-[13.5px] text-gray-600">
          <input
            type="checkbox"
            checked={sensitiveOnly}
            onChange={(e) => { setSensitiveOnly(e.target.checked); setPage(1); }}
          />
          Only marks, fees and other sensitive actions
        </label>
      </div>

      <Panel title={data ? `${data.total} records` : 'Activity'}>
        {isLoading ? (
          <Loading />
        ) : !data?.rows.length ? (
          <Empty title="Nothing logged for this filter" />
        ) : (
          <>
            <Table head={['When', 'Who', 'Role', 'Module', 'Action', 'Details']}>
              {data.rows.map((r: any) => (
                <tr key={r.id} className={r.isSensitive ? 'bg-amber-light/40' : ''}>
                  <Td className="text-gray-500 whitespace-nowrap">{timeAgo(r.at)}</Td>
                  <Td className="font-medium">{r.who}</Td>
                  <Td className="text-gray-500">{r.role?.toLowerCase().replace('_', ' ')}</Td>
                  <Td>{r.module.toLowerCase()}</Td>
                  <Td>
                    {r.isSensitive ? (
                      <Badge tone="pending">{r.action.replace(/_/g, ' ').toLowerCase()}</Badge>
                    ) : (
                      r.action.replace(/_/g, ' ').toLowerCase()
                    )}
                  </Td>
                  <Td className="text-gray-500 max-w-[280px] truncate">
                    {r.details ? JSON.stringify(r.details) : '—'}
                  </Td>
                </tr>
              ))}
            </Table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-line">
                <span className="text-[13px] text-gray-500">Page {data.page} of {data.pages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" variant="secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
