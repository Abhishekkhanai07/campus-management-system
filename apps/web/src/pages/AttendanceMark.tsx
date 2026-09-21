import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { todayIso } from '../lib/format';
import {
  Button, Empty, ErrorNote, Loading, Note, Panel, PageTitle, Select, Field,
} from '../components/ui';

type Status = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE';

const CYCLE: Status[] = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'];
const LABEL: Record<Status, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  ON_LEAVE: 'Leave',
};
const SWATCH: Record<Status, string> = {
  PRESENT: 'bg-grass-light border-grass/30 text-grass',
  ABSENT: 'bg-rose-light border-rose/30 text-rose',
  LATE: 'bg-amber-light border-amber/30 text-amber',
  ON_LEAVE: 'bg-gray-100 border-gray-300 text-gray-600',
};

export default function AttendanceMark() {
  const user = useAuth((s) => s.user)!;
  const [params, setParams] = useSearchParams();

  const [mode, setMode] = useState<'daily' | 'period'>(params.get('slotId') ? 'period' : 'daily');
  const [date, setDate] = useState(params.get('date') || todayIso());
  const [sectionId, setSectionId] = useState(params.get('sectionId') || '');
  const [slotId, setSlotId] = useState(params.get('slotId') || '');
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  // what this teacher is allowed to mark
  const { data: teaching } = useQuery({
    queryKey: ['my-teaching'],
    queryFn: () => get<any>('/staff/me/teaching'),
    enabled: ['TEACHER', 'HOD'].includes(user.role),
  });

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => get<any[]>('/academic/sections'),
    enabled: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
  });

  const sectionOptions = useMemo(() => {
    if (sections) return sections.map((s) => ({ id: s.id, label: `${s.classLevel.name} ${s.name}` }));
    return (teaching?.classTeacherOf || []).map((c: any) => ({ id: c.sectionId, label: c.section }));
  }, [sections, teaching]);

  const slotOptions = teaching?.todaySlots || [];

  useEffect(() => {
    if (!sectionId && sectionOptions.length === 1) setSectionId(sectionOptions[0].id);
  }, [sectionOptions]);

  const rosterKey = mode === 'daily'
    ? ['roster-daily', sectionId, date]
    : ['roster-period', slotId, date];

  const { data: roster, isLoading, refetch } = useQuery({
    queryKey: rosterKey,
    queryFn: () =>
      mode === 'daily'
        ? get<any>('/attendance/daily/roster', { sectionId, date })
        : get<any>('/attendance/period/roster', { slotId, date }),
    enabled: mode === 'daily' ? !!sectionId && !!date : !!slotId && !!date,
    retry: false,
  });

  // seed the local marks from whatever is already saved
  useEffect(() => {
    if (!roster?.rows) return;
    const next: Record<string, Status> = {};
    for (const r of roster.rows) next[r.studentId] = r.status;
    setMarks(next);
    setSaved('');
  }, [roster]);

  const counts = useMemo(() => {
    const vals = Object.values(marks);
    return {
      total: vals.length,
      present: vals.filter((v) => v === 'PRESENT').length,
      absent: vals.filter((v) => v === 'ABSENT').length,
      late: vals.filter((v) => v === 'LATE').length,
      leave: vals.filter((v) => v === 'ON_LEAVE').length,
    };
  }, [marks]);

  const cycle = (studentId: string) =>
    setMarks((m) => {
      const cur = m[studentId] || 'PRESENT';
      const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
      return { ...m, [studentId]: next };
    });

  const setAll = (status: Status) =>
    setMarks((m) => Object.fromEntries(Object.keys(m).map((k) => [k, status])) as Record<string, Status>);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const rows = Object.entries(marks).map(([studentId, status]) => ({ studentId, status }));
      const res =
        mode === 'daily'
          ? await post<any>('/attendance/daily', { sectionId, date, rows })
          : await post<any>('/attendance/period', { slotId, date, rows });
      setSaved(res.message || `Saved ${res.saved} students`);
      refetch();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const switchMode = (m: 'daily' | 'period') => {
    setMode(m);
    setError('');
    setParams({});
  };

  return (
    <>
      <PageTitle
        title="Take attendance"
        subtitle="Everyone starts as present. Tap a student to change them."
      />

      {/* controls */}
      <Panel className="mb-4">
        <div className="p-4 grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] items-end">
          <div className="inline-flex rounded-md border border-line overflow-hidden">
            <button
              onClick={() => switchMode('daily')}
              className={`px-3 py-2 text-[13.5px] ${mode === 'daily' ? 'bg-ink text-white' : 'bg-white text-gray-600'}`}
            >
              Day register
            </button>
            <button
              onClick={() => switchMode('period')}
              className={`px-3 py-2 text-[13.5px] border-l border-line ${
                mode === 'period' ? 'bg-ink text-white' : 'bg-white text-gray-600'
              }`}
            >
              Subject period
            </button>
          </div>

          {mode === 'daily' ? (
            <Field label="Class">
              <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">Choose a class</option>
                {sectionOptions.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Period">
              <Select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
                <option value="">Choose a period from today</option>
                {slotOptions.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    Period {s.periodNo} · {s.subject} · {s.section}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Date">
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-line rounded-md px-3 py-2 text-[14px] bg-white focus:border-teal outline-none"
            />
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" size="md" onClick={() => setAll('PRESENT')} disabled={!roster}>
              All present
            </Button>
          </div>
        </div>
      </Panel>

      {mode === 'daily' && sectionOptions.length === 0 && (
        <Note>
          You are not a class teacher of any section, so the day register is not yours to mark.
          Switch to “Subject period” to mark your own periods.
        </Note>
      )}

      {error && <div className="mb-4"><ErrorNote text={error} /></div>}

      {isLoading && <Loading label="Loading the roster" />}

      {roster && (
        <>
          {roster.isHoliday && <Note>This date is a declared holiday, so attendance is not taken.</Note>}
          {roster.substitute && (
            <div className="mb-4">
              <Note>
                {roster.slot.regularTeacher} is absent. {roster.substitute} is covering this period.
              </Note>
            </div>
          )}

          <Panel
            title={
              mode === 'daily'
                ? `${roster.section.name} · ${roster.rows.length} students`
                : `${roster.slot.section} · ${roster.slot.subject} · period ${roster.slot.periodNo}`
            }
            subtitle={roster.alreadyMarked ? 'Already marked — saving again will update it' : 'Not marked yet'}
          >
            {roster.rows.length === 0 ? (
              <Empty title="No students enrolled in this section" />
            ) : (
              <div className="p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roster.rows.map((r: any) => {
                  const status = marks[r.studentId] || 'PRESENT';
                  return (
                    <button
                      key={r.studentId}
                      onClick={() => cycle(r.studentId)}
                      className={`flex items-center justify-between gap-3 border rounded-md px-3 py-2.5 text-left transition-colors ${SWATCH[status]}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-ink truncate">
                          <span className="tabular text-gray-500 mr-2">{r.rollNo ?? '–'}</span>
                          {r.name}
                        </span>
                        <span className="block text-[11.5px] text-gray-500 tabular">{r.admissionNo || ''}</span>
                      </span>
                      <span className="text-[12.5px] font-semibold whitespace-nowrap">{LABEL[status]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* sticky summary + save */}
          <div className="sticky bottom-0 mt-4 bg-white border border-line rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex gap-5 text-[13.5px] tabular">
              <span className="text-grass">{counts.present} present</span>
              <span className="text-rose">{counts.absent} absent</span>
              <span className="text-amber">{counts.late} late</span>
              <span className="text-gray-500">{counts.leave} on leave</span>
            </div>
            <div className="flex items-center gap-3">
              {saved && <span className="text-[13px] text-grass">{saved}</span>}
              <Button onClick={save} disabled={saving || !roster.rows.length || roster.isHoliday}>
                {saving ? 'Saving…' : roster.alreadyMarked ? 'Update attendance' : 'Save attendance'}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
