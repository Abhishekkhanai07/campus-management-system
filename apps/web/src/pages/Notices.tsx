import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import {
  Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Select, PageTitle,
} from '../components/ui';

export default function Notices() {
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL' });

  const canPost = ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE'].includes(user.role);

  const { data, isLoading } = useQuery({ queryKey: ['notices'], queryFn: () => get<any[]>('/notices') });

  const create = useMutation({
    mutationFn: () => post('/notices', form),
    onSuccess: () => {
      setForm({ title: '', body: '', audience: 'ALL' });
      qc.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <>
      <PageTitle title="Notices" subtitle="Announcements for staff, students and parents." />

      {canPost && (
        <Panel title="Post a notice" className="mb-4">
          <form className="p-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Who should see it">
              <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="ALL">Everyone</option>
                <option value="STAFF">Staff only</option>
                <option value="STUDENTS">Students</option>
                <option value="PARENTS">Parents</option>
              </Select>
            </Field>
            <Field label="Message">
              <Input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={create.isPending}>Publish</Button>
              {error && <ErrorNote text={error} />}
            </div>
          </form>
        </Panel>
      )}

      {isLoading ? (
        <Loading />
      ) : !data?.length ? (
        <Empty title="No notices yet" />
      ) : (
        <div className="space-y-3">
          {data.map((n: any) => (
            <Panel key={n.id}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-semibold text-ink">{n.title}</h3>
                  <Badge tone="info">{n.audience.toLowerCase()}</Badge>
                </div>
                <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed">{n.body}</p>
                <p className="text-[12px] text-gray-400 mt-2">{timeAgo(n.createdAt)}</p>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
