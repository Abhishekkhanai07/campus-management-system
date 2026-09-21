import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, errorText } from '../lib/api';
import { money, dateIn, timeAgo } from '../lib/format';
import {
  Badge, Button, Empty, ErrorNote, Field, Input, Loading, Panel, Select, Stat, Table, Td,
  PageTitle,
} from '../components/ui';

export default function Fees() {
  const [tab, setTab] = useState<'dues' | 'collect'>('dues');
  const [studentId, setStudentId] = useState('');

  const { data: summary } = useQuery({ queryKey: ['fee-summary'], queryFn: () => get<any>('/fees/summary') });

  return (
    <>
      <PageTitle title="Fees" subtitle="Collect a payment, print the receipt, and see who still owes." />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Collected today" value={money(summary.today.amount)} hint={`${summary.today.count} receipts`} tone="grass" />
          <Stat label="This month" value={money(summary.month.amount)} hint={`${summary.month.count} receipts`} tone="teal" />
          <Stat label="Cash this month" value={money(summary.byMode?.CASH || 0)} />
          <Stat label="Online this month" value={money((summary.byMode?.UPI || 0) + (summary.byMode?.NETBANKING || 0))} />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {([['dues', 'Outstanding dues'], ['collect', 'Collect a payment']] as const).map(([k, l]) => (
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

      {tab === 'dues' ? (
        <Dues onCollect={(id) => { setStudentId(id); setTab('collect'); }} />
      ) : (
        <Collect studentId={studentId} setStudentId={setStudentId} />
      )}
    </>
  );
}

function Dues({ onCollect }: { onCollect: (studentId: string) => void }) {
  const [sectionId, setSectionId] = useState('');
  const { data: sections } = useQuery({ queryKey: ['sections'], queryFn: () => get<any[]>('/academic/sections') });
  const { data, isLoading } = useQuery({
    queryKey: ['dues', sectionId],
    queryFn: () => get<any>('/fees/dues', { sectionId: sectionId || undefined }),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="max-w-[240px] mb-4">
        <option value="">All sections</option>
        {sections?.map((s) => (
          <option key={s.id} value={s.id}>{s.classLevel.name} {s.name}</option>
        ))}
      </Select>

      <Panel
        title={`${data?.count || 0} students owe ${money(data?.totalDue || 0)}`}
        subtitle="Longest overdue first"
      >
        {!data?.rows.length ? (
          <Empty title="No dues outstanding" hint="Every assigned fee has been collected." />
        ) : (
          <Table head={['Student', 'Class', 'Payable', 'Paid', 'Balance', 'Overdue', '']}>
            {data.rows.map((r: any) => (
              <tr key={r.studentFeeId}>
                <Td>
                  <Link to={`/students/${r.studentId}`} className="font-medium text-ink hover:text-teal">
                    {r.name}
                  </Link>
                  <div className="text-[12px] text-gray-400 tabular">{r.admissionNo}</div>
                </Td>
                <Td>{r.section}</Td>
                <Td className="tabular">{money(r.netPayable)}</Td>
                <Td className="tabular text-gray-500">{money(r.paid)}</Td>
                <Td className="tabular font-medium">{money(r.balance)}</Td>
                <Td>
                  <Badge tone={r.ageDays > 60 ? 'absent' : r.ageDays > 0 ? 'pending' : 'muted'}>{r.bucket}</Badge>
                </Td>
                <Td>
                  <Button size="sm" variant="secondary" onClick={() => onCollect(r.studentId)}>Collect</Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}

function Collect({ studentId, setStudentId }: { studentId: string; setStudentId: (s: string) => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<any>(null);

  const { data: students } = useQuery({
    queryKey: ['students', q],
    queryFn: () => get<any[]>('/students', { q }),
    enabled: q.length > 1,
  });

  const { data: fees } = useQuery({
    queryKey: ['student-fees', studentId],
    queryFn: () => get<any>(`/fees/student/${studentId}`),
    enabled: !!studentId,
  });

  const collect = useMutation({
    mutationFn: (studentFeeId: string) =>
      post<any>('/fees/collect', { studentFeeId, amount: Number(amount), mode }),
    onSuccess: (res) => {
      setReceipt(res);
      setAmount('');
      setError('');
      qc.invalidateQueries({ queryKey: ['student-fees', studentId] });
      qc.invalidateQueries({ queryKey: ['dues'] });
      qc.invalidateQueries({ queryKey: ['fee-summary'] });
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-4 items-start">
      <Panel title="Find the student">
        <div className="p-4 space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or admission number" />
          {students?.slice(0, 8).map((s: any) => (
            <button
              key={s.id}
              onClick={() => setStudentId(s.id)}
              className={`block w-full text-left border rounded-md px-3 py-2 text-[13.5px] ${
                studentId === s.id ? 'border-teal bg-teal-light' : 'border-line hover:border-teal'
              }`}
            >
              <span className="font-medium">{s.firstName} {s.lastName}</span>
              <span className="text-gray-400 tabular ml-2">{s.admissionNo}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        {!studentId ? (
          <Panel><Empty title="Choose a student" hint="Search by name or admission number on the left." /></Panel>
        ) : !fees ? (
          <Loading />
        ) : (
          <>
            <Panel title="Fee position" subtitle={`Paid ${money(fees.paid)} of ${money(fees.total)}`}>
              {fees.rows.map((r: any) => (
                <div key={r.id} className="px-4 py-3 border-b border-line last:border-0">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-medium text-[14px]">{r.structure}</div>
                      <div className="text-[12.5px] text-gray-500">
                        {r.heads.map((h: any) => `${h.name} ${money(h.amount)}`).join(' · ')}
                      </div>
                      {r.concession > 0 && (
                        <div className="text-[12.5px] text-teal mt-0.5">Concession {money(r.concession)}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="tabular font-semibold">{money(r.netPayable - r.paid)}</div>
                      <div className="text-[12px] text-gray-400">balance</div>
                    </div>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    {r.installments.map((i: any) => (
                      <div
                        key={i.seq}
                        className={`border rounded-md px-3 py-2 text-[13px] flex justify-between ${
                          i.isOverdue ? 'border-rose/30 bg-rose-light' : 'border-line'
                        }`}
                      >
                        <span className="text-gray-600">Installment {i.seq} · {dateIn(i.dueDate)}</span>
                        <span className="tabular">{money(i.paidAmount)} / {money(i.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {r.netPayable - r.paid > 0 && (
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <Field label="Amount">
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={String(r.netPayable - r.paid)}
                          className="w-36"
                        />
                      </Field>
                      <Field label="Mode">
                        <Select value={mode} onChange={(e) => setMode(e.target.value)} className="w-36">
                          {['CASH', 'UPI', 'NETBANKING', 'CHEQUE', 'CARD'].map((m) => (
                            <option key={m} value={m}>{m.toLowerCase()}</option>
                          ))}
                        </Select>
                      </Field>
                      <Button onClick={() => collect.mutate(r.id)} disabled={!amount || collect.isPending}>
                        Collect and issue receipt
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </Panel>

            {error && <ErrorNote text={error} />}

            {receipt && (
              <Panel title="Receipt issued">
                <div className="p-4 text-[14px]">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-gray-500">Receipt number</span>
                    <span className="tabular font-semibold">{receipt.receiptNo}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-500">Amount received</span>
                    <span className="tabular">{money(receipt.payment.amount)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Balance after payment</span>
                    <span className="tabular">{money(receipt.balanceAfter)}</span>
                  </div>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => window.print()}>
                    Print receipt
                  </Button>
                </div>
              </Panel>
            )}

            {fees.rows.some((r: any) => r.receipts.length) && (
              <Panel title="Earlier receipts">
                <Table head={['Receipt', 'Amount', 'Mode', 'Date']}>
                  {fees.rows.flatMap((r: any) =>
                    r.receipts.map((p: any) => (
                      <tr key={p.id} className={p.isCancelled ? 'text-gray-400 line-through' : ''}>
                        <Td className="tabular">{p.receiptNo}</Td>
                        <Td className="tabular">{money(p.amount)}</Td>
                        <Td>{p.mode.toLowerCase()}</Td>
                        <Td className="text-gray-500">{timeAgo(p.paidAt)}</Td>
                      </tr>
                    )),
                  )}
                </Table>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
