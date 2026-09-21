import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, errorText } from '../lib/api';
import { dateIn } from '../lib/format';
import {
  Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Table, Td, PageTitle,
} from '../components/ui';

export default function Setup() {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data: inst, isLoading } = useQuery({ queryKey: ['institute'], queryFn: () => get<any>('/academic/institute') });
  const { data: years } = useQuery({ queryKey: ['years'], queryFn: () => get<any[]>('/academic/years') });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => get<any[]>('/academic/classes') });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: () => get<any[]>('/academic/subjects') });

  const saveRules = useMutation({
    mutationFn: (body: any) => patch('/academic/institute', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute'] }),
    onError: (e) => setError(errorText(e)),
  });

  const activateYear = useMutation({
    mutationFn: (id: string) => patch(`/academic/years/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['years'] }),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <PageTitle title="Setup" subtitle="Rules the whole system follows. Change them here, not in the code." />

      {error && <div className="mb-4"><ErrorNote text={error} /></div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Institute">
          <div className="p-4 space-y-2 text-[14px]">
            <Row label="Name" value={inst?.name} />
            <Row label="Board" value={inst?.board} />
            <Row label="Code" value={inst?.code} />
            <Row label="Address" value={inst?.address} />
            <Row label="Phone" value={inst?.phone} />
          </div>
        </Panel>

        <Panel title="Rules">
          <form
            className="p-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.target as HTMLFormElement);
              saveRules.mutate({
                minAttendancePct: Number(f.get('minAttendancePct')),
                attendanceEditWindowHrs: Number(f.get('attendanceEditWindowHrs')),
                leaveCountsAsPresent: f.get('leaveCountsAsPresent') === 'on',
                allowLateSubmission: f.get('allowLateSubmission') === 'on',
              });
            }}
          >
            <Field label="Minimum attendance to appear for exams (%)">
              <Input name="minAttendancePct" type="number" defaultValue={inst?.minAttendancePct} />
            </Field>
            <Field
              label="Hours a teacher may edit attendance after marking"
              hint="After this, a correction has to be approved."
            >
              <Input name="attendanceEditWindowHrs" type="number" defaultValue={inst?.attendanceEditWindowHrs} />
            </Field>
            <label className="flex items-center gap-2 text-[13.5px]">
              <input type="checkbox" name="leaveCountsAsPresent" defaultChecked={inst?.leaveCountsAsPresent} />
              Approved leave counts as present in the percentage
            </label>
            <label className="flex items-center gap-2 text-[13.5px]">
              <input type="checkbox" name="allowLateSubmission" defaultChecked={inst?.allowLateSubmission} />
              Allow assignment submission after the due date
            </label>
            <Button type="submit" disabled={saveRules.isPending}>Save rules</Button>
          </form>
        </Panel>

        <Panel title="Academic years">
          <Table head={['Year', 'From', 'To', '']}>
            {years?.map((y: any) => (
              <tr key={y.id}>
                <Td className="font-medium">{y.name}</Td>
                <Td className="tabular">{dateIn(y.startDate)}</Td>
                <Td className="tabular">{dateIn(y.endDate)}</Td>
                <Td>
                  {y.isActive ? (
                    <Badge tone="present">active</Badge>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => activateYear.mutate(y.id)}>
                      Make active
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Classes and subjects">
          {!classes?.length ? (
            <Empty title="No classes yet" />
          ) : (
            <Table head={['Class', 'Sections', 'Subjects']}>
              {classes.map((c: any) => (
                <tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{c.sections.map((s: any) => s.name).join(', ') || '—'}</Td>
                  <Td className="text-gray-600">{c.classSubjects.length}</Td>
                </tr>
              ))}
            </Table>
          )}
          <div className="px-4 py-3 border-t border-line text-[13px] text-gray-500">
            {subjects?.length || 0} subjects defined
          </div>
        </Panel>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line last:border-0 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right">{value || '—'}</span>
    </div>
  );
}
