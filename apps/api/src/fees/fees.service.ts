import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicService } from '../academic/academic.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { AssignFeeDto, CollectDto, CreateFeeHeadDto, CreateStructureDto } from './dto';
import { isoDate, toDateOnly, today } from '../common/dates';

@Injectable()
export class FeesService {
  constructor(private prisma: PrismaService, private academic: AcademicService) {}

  heads() { return this.prisma.feeHead.findMany({ orderBy: { name: 'asc' } }); }
  createHead(dto: CreateFeeHeadDto) { return this.prisma.feeHead.create({ data: dto }); }

  async structures() {
    const year = await this.academic.requireActiveYear();
    return this.prisma.feeStructure.findMany({
      where: { academicYearId: year.id },
      include: { items: { include: { feeHead: true } }, classLevel: true, _count: { select: { studentFees: true } } },
    });
  }

  async createStructure(dto: CreateStructureDto) {
    const year = await this.academic.requireActiveYear();
    return this.prisma.feeStructure.create({
      data: {
        name: dto.name,
        classLevelId: dto.classLevelId,
        academicYearId: year.id,
        items: { create: dto.items },
      },
      include: { items: true },
    });
  }

  /** Applies a structure to a student and creates the installment plan. */
  async assign(dto: AssignFeeDto) {
    const structure = await this.prisma.feeStructure.findUnique({
      where: { id: dto.feeStructureId },
      include: { items: true },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const total = structure.items.reduce((a, i) => a + i.amount, 0);
    const concession = dto.concession || 0;
    const net = total - concession;

    const studentFee = await this.prisma.studentFee.create({
      data: {
        studentId: dto.studentId,
        feeStructureId: dto.feeStructureId,
        totalAmount: total,
        concession,
        concessionNote: dto.concessionNote,
        netPayable: net,
        installments: {
          create: [
            { seq: 1, amount: Math.round(net * 0.5 * 100) / 100, dueDate: today() },
            {
              seq: 2,
              amount: Math.round(net * 0.5 * 100) / 100,
              dueDate: new Date(Date.now() + 90 * 86400000),
            },
          ],
        },
      },
      include: { installments: true },
    });
    return studentFee;
  }

  /**
   * BR-12/13: one receipt per payment, gapless serial, oldest installment cleared first,
   * receipts are never edited - only cancelled.
   */
  async collect(user: AuthUser, dto: CollectDto) {
    const studentFee = await this.prisma.studentFee.findUnique({
      where: { id: dto.studentFeeId },
      include: { installments: { orderBy: { seq: 'asc' } }, payments: { where: { isCancelled: false } } },
    });
    if (!studentFee) throw new NotFoundException('Fee record not found');

    const paid = studentFee.payments.reduce((a, p) => a + p.amount, 0);
    const balance = studentFee.netPayable - paid;
    if (dto.amount <= 0) throw new BadRequestException('Amount must be more than zero');
    if (dto.amount > balance + 0.01)
      throw new BadRequestException(`Amount is more than the balance of INR ${balance.toFixed(2)}`);

    const count = await this.prisma.feePayment.count();
    const receiptNo = `RCP${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;

    const payment = await this.prisma.feePayment.create({
      data: {
        studentFeeId: dto.studentFeeId,
        receiptNo,
        amount: dto.amount,
        mode: (dto.mode as any) || 'CASH',
        reference: dto.reference,
        collectedById: user.id,
      },
    });

    // adjust against the oldest unpaid installment first
    let remaining = dto.amount;
    for (const inst of studentFee.installments) {
      if (remaining <= 0) break;
      const due = inst.amount - inst.paidAmount;
      if (due <= 0) continue;
      const apply = Math.min(due, remaining);
      await this.prisma.feeInstallment.update({
        where: { id: inst.id },
        data: { paidAmount: { increment: apply } },
      });
      remaining -= apply;
    }

    return { payment, receiptNo, balanceAfter: Math.round((balance - dto.amount) * 100) / 100 };
  }

  async cancelReceipt(id: string, reason: string) {
    return this.prisma.feePayment.update({
      where: { id },
      data: { isCancelled: true, cancelReason: reason },
    });
  }

  /** Student / parent view and the accountant's per-student view. */
  async studentFees(studentId: string) {
    const rows = await this.prisma.studentFee.findMany({
      where: { studentId },
      include: {
        feeStructure: { include: { items: { include: { feeHead: true } } } },
        installments: { orderBy: { seq: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });

    const total = rows.reduce((a, r) => a + r.netPayable, 0);
    const paid = rows.reduce(
      (a, r) => a + r.payments.filter((p) => !p.isCancelled).reduce((s, p) => s + p.amount, 0),
      0,
    );

    return {
      total,
      paid,
      balance: Math.round((total - paid) * 100) / 100,
      rows: rows.map((r) => ({
        id: r.id,
        structure: r.feeStructure.name,
        heads: r.feeStructure.items.map((i) => ({ name: i.feeHead.name, amount: i.amount })),
        totalAmount: r.totalAmount,
        concession: r.concession,
        netPayable: r.netPayable,
        paid: r.payments.filter((p) => !p.isCancelled).reduce((s, p) => s + p.amount, 0),
        installments: r.installments.map((i) => ({
          seq: i.seq,
          amount: i.amount,
          paidAmount: i.paidAmount,
          dueDate: isoDate(i.dueDate),
          isOverdue: i.paidAmount < i.amount && toDateOnly(i.dueDate) < today(),
        })),
        receipts: r.payments.map((p) => ({
          id: p.id,
          receiptNo: p.receiptNo,
          amount: p.amount,
          mode: p.mode,
          paidAt: p.paidAt,
          isCancelled: p.isCancelled,
        })),
      })),
    };
  }

  /** Dues with ageing buckets (FR-FEE-09). */
  async dues(sectionId?: string) {
    const year = await this.academic.requireActiveYear();
    const fees = await this.prisma.studentFee.findMany({
      include: {
        student: {
          include: {
            enrollments: {
              where: { academicYearId: year.id, status: 'ACTIVE' },
              include: { section: { include: { classLevel: true } } },
            },
          },
        },
        installments: true,
        payments: { where: { isCancelled: false } },
      },
    });

    const rows = fees
      .filter((f) => !sectionId || f.student.enrollments.some((e) => e.sectionId === sectionId))
      .map((f) => {
        const paid = f.payments.reduce((a, p) => a + p.amount, 0);
        const balance = Math.round((f.netPayable - paid) * 100) / 100;
        const overdue = f.installments
          .filter((i) => i.paidAmount < i.amount && toDateOnly(i.dueDate) < today())
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
        const ageDays = overdue
          ? Math.floor((today().getTime() - toDateOnly(overdue.dueDate).getTime()) / 86400000)
          : 0;
        const e = f.student.enrollments[0];
        return {
          studentFeeId: f.id,
          studentId: f.studentId,
          name: `${f.student.firstName} ${f.student.lastName}`,
          admissionNo: f.student.admissionNo,
          section: e ? `${e.section.classLevel.name} ${e.section.name}` : '',
          netPayable: f.netPayable,
          paid,
          balance,
          ageDays,
          bucket: ageDays === 0 ? 'Not due' : ageDays <= 30 ? '0-30 days' : ageDays <= 60 ? '31-60 days' : 'Over 60 days',
        };
      })
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.ageDays - a.ageDays);

    return {
      count: rows.length,
      totalDue: Math.round(rows.reduce((a, r) => a + r.balance, 0) * 100) / 100,
      rows,
    };
  }

  /** Daily and monthly collection summary for the accountant's dashboard. */
  async collectionSummary() {
    const start = today();
    const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

    const [todayRows, monthRows] = await Promise.all([
      this.prisma.feePayment.findMany({ where: { isCancelled: false, paidAt: { gte: start } } }),
      this.prisma.feePayment.findMany({ where: { isCancelled: false, paidAt: { gte: monthStart } } }),
    ]);

    const byMode: Record<string, number> = {};
    for (const p of monthRows) byMode[p.mode] = (byMode[p.mode] || 0) + p.amount;

    return {
      today: { count: todayRows.length, amount: todayRows.reduce((a, p) => a + p.amount, 0) },
      month: { count: monthRows.length, amount: monthRows.reduce((a, p) => a + p.amount, 0) },
      byMode,
      recent: monthRows.slice(-10).reverse(),
    };
  }
}
