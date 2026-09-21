import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import { money, dateIn } from '../../lib/format';
import { Badge, Empty, Loading, Panel, Stat, Table, Td, PageTitle } from '../../components/ui';

export default function MyFees() {
  const { data, isLoading } = useQuery({ queryKey: ['my-fees'], queryFn: () => get<any>('/fees/mine') });

  if (isLoading) return <Loading />;
  if (!data?.rows.length) return <Empty title="No fee assigned yet" />;

  return (
    <>
      <PageTitle title="My fees" subtitle="What is payable, what is paid, and the receipts." />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Total payable" value={money(data.total)} />
        <Stat label="Paid" value={money(data.paid)} tone="grass" />
        <Stat label="Balance" value={money(data.balance)} tone={data.balance > 0 ? 'amber' : 'grass'} />
      </div>

      {data.rows.map((r: any) => (
        <div key={r.id} className="mb-4 space-y-4">
          <Panel title={r.structure} subtitle={r.concession ? `Concession ${money(r.concession)}` : undefined}>
            <Table head={['Head', 'Amount']}>
              {r.heads.map((h: any) => (
                <tr key={h.name}>
                  <Td>{h.name}</Td>
                  <Td className="tabular">{money(h.amount)}</Td>
                </tr>
              ))}
              <tr className="font-semibold">
                <Td>Net payable</Td>
                <Td className="tabular">{money(r.netPayable)}</Td>
              </tr>
            </Table>
          </Panel>

          <Panel title="Installments">
            <Table head={['Installment', 'Due date', 'Amount', 'Paid', 'Status']}>
              {r.installments.map((i: any) => (
                <tr key={i.seq}>
                  <Td className="tabular">{i.seq}</Td>
                  <Td className="tabular">{dateIn(i.dueDate)}</Td>
                  <Td className="tabular">{money(i.amount)}</Td>
                  <Td className="tabular">{money(i.paidAmount)}</Td>
                  <Td>
                    {i.paidAmount >= i.amount ? (
                      <Badge tone="present">paid</Badge>
                    ) : i.isOverdue ? (
                      <Badge tone="absent">overdue</Badge>
                    ) : (
                      <Badge tone="pending">due</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </Panel>

          {r.receipts.length > 0 && (
            <Panel title="Receipts">
              <Table head={['Receipt', 'Amount', 'Mode', 'Date']}>
                {r.receipts.map((p: any) => (
                  <tr key={p.id} className={p.isCancelled ? 'text-gray-400 line-through' : ''}>
                    <Td className="tabular">{p.receiptNo}</Td>
                    <Td className="tabular">{money(p.amount)}</Td>
                    <Td>{p.mode.toLowerCase()}</Td>
                    <Td className="tabular">{dateIn(p.paidAt)}</Td>
                  </tr>
                ))}
              </Table>
            </Panel>
          )}
        </div>
      ))}
    </>
  );
}
