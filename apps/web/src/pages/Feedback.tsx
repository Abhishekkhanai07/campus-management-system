import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, get, patch, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Select, Table, Td, PageTitle, Textarea, statusTone } from '../components/ui';

const monthValue = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

export default function Feedback() {
  const user = useAuth((state) => state.user)!;
  const isStudent = user.role === 'STUDENT';
  const [error, setError] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [month, setMonth] = useState(monthValue());
  const [rating, setRating] = useState('5');
  const [comments, setComments] = useState('');
  const qc = useQueryClient();

  const { data: mine, isLoading: mineLoading } = useQuery({
    queryKey: ['my-feedback'], queryFn: () => get<any>('/feedback/mine'), enabled: isStudent,
  });
  const { data: teachers } = useQuery({
    queryKey: ['feedback-teachers'], queryFn: () => get<any[]>('/feedback/teachers'), enabled: isStudent,
  });
  const { data: complaints, isLoading: complaintsLoading } = useQuery({
    queryKey: ['feedback-complaints'], queryFn: () => get<any[]>('/feedback/complaints'), enabled: !isStudent,
  });
  const { data: monthly, isLoading: monthlyLoading } = useQuery({
    queryKey: ['feedback-monthly'], queryFn: () => get<any[]>('/feedback/monthly'), enabled: !isStudent,
  });

  const submitComplaint = useMutation({
    mutationFn: () => post('/feedback/complaints', { teacherId, subject, description }),
    onSuccess: () => { setTeacherId(''); setSubject(''); setDescription(''); qc.invalidateQueries({ queryKey: ['my-feedback'] }); },
    onError: (e) => setError(errorText(e)),
  });
  const submitMonthly = useMutation({
    mutationFn: () => post('/feedback/monthly', { month, rating: Number(rating), comments }),
    onSuccess: () => { setComments(''); qc.invalidateQueries({ queryKey: ['my-feedback'] }); },
    onError: (e) => setError(errorText(e)),
  });
  const updateComplaint = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => patch(`/feedback/complaints/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-complaints'] }),
    onError: (e) => setError(errorText(e)),
  });

  return (
    <>
      <PageTitle title="Student voice" subtitle={isStudent ? 'Share a concern privately with school management and rate your class each month.' : 'Review student complaints and monthly class feedback. Teachers cannot access this area.'} />
      {error && <div className="mb-4"><ErrorNote text={error} /></div>}
      {isStudent ? (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Report a teacher concern" subtitle="This goes to administrators and heads of department only.">
              <form className="p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); submitComplaint.mutate(); }}>
                <Field label="Teacher"><Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required><option value="">Choose teacher</option>{teachers?.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.subject}</option>)}</Select></Field>
                <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" required /></Field>
                <Field label="Details"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe what happened" required /></Field>
                <Button type="submit" disabled={submitComplaint.isPending}>Submit privately</Button>
              </form>
            </Panel>
            <Panel title="Monthly class feedback" subtitle="One response per month. Your name is visible only to management.">
              <form className="p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); submitMonthly.mutate(); }}>
                <Field label="Month"><Input type="month" value={month.slice(0, 7)} onChange={(e) => setMonth(`${e.target.value}-01`)} required /></Field>
                <Field label="Class rating"><Select value={rating} onChange={(e) => setRating(e.target.value)}><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Fair</option><option value="2">2 · Needs improvement</option><option value="1">1 · Poor</option></Select></Field>
                <Field label="Comments"><Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={4} placeholder="What should improve in your class?" /></Field>
                <Button type="submit" disabled={submitMonthly.isPending}>Save monthly feedback</Button>
              </form>
            </Panel>
          </div>
          <Panel title="Your submissions">
            {mineLoading ? <Loading /> : !mine?.complaints?.length && !mine?.monthlyFeedback?.length ? <Empty title="No feedback submitted yet" /> : <div className="p-4 space-y-3 text-[13.5px]">{mine?.complaints?.map((item: any) => <div key={item.id} className="border-b border-line pb-3"><div className="flex justify-between gap-3"><strong>{item.subject}</strong><Badge tone={statusTone(item.status)}>{item.status.replace('_', ' ').toLowerCase()}</Badge></div><div className="text-gray-500 mt-1">To {item.teacher.firstName} {item.teacher.lastName} · {item.description}</div>{item.response && <div className="mt-2 text-teal">Management: {item.response}</div>}</div>)}{mine?.monthlyFeedback?.map((item: any) => <div key={item.id} className="border-b border-line pb-3">Monthly class feedback · rating {item.rating}/5{item.comments && <span className="text-gray-500"> · {item.comments}</span>}</div>)}</div>}
          </Panel>
        </div>
      ) : (
        <div className="space-y-4">
          <Panel title="Teacher complaints" subtitle="Only administrators and heads of department can see these submissions.">
            {complaintsLoading ? <Loading /> : !complaints?.length ? <Empty title="No complaints submitted" /> : <Table head={['Student', 'Teacher', 'Subject', 'Details', 'Status', '']}>{complaints.map((item: any) => <tr key={item.id}><Td className="font-medium">{item.student.firstName} {item.student.lastName}</Td><Td>{item.teacher.firstName} {item.teacher.lastName}</Td><Td>{item.subject}</Td><Td className="max-w-sm">{item.description}</Td><Td><Badge tone={statusTone(item.status)}>{item.status.replace('_', ' ').toLowerCase()}</Badge></Td><Td><Select value={item.status} onChange={(e) => updateComplaint.mutate({ id: item.id, status: e.target.value })}><option>OPEN</option><option>IN_REVIEW</option><option>RESOLVED</option><option>CLOSED</option></Select></Td></tr>)}</Table>}
          </Panel>
          <Panel title="Monthly class feedback" subtitle="Use ratings and comments to identify class-level issues without exposing feedback to teachers.">
            {monthlyLoading ? <Loading /> : !monthly?.length ? <Empty title="No monthly feedback submitted" /> : <Table head={['Month', 'Class', 'Student', 'Rating', 'Comments']}>{monthly.map((item: any) => <tr key={item.id}><Td>{new Date(item.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Td><Td>{item.section.classLevel.name} {item.section.name}</Td><Td>{item.student.firstName} {item.student.lastName}</Td><Td className="tabular">{item.rating}/5</Td><Td>{item.comments || '—'}</Td></tr>)}</Table>}
          </Panel>
        </div>
      )}
    </>
  );
}
