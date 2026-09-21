import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { LeavesService } from '../leaves/leaves.service';
import { AcademicService } from '../academic/academic.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AuthUser } from '../common/decorators/current-user.decorator';


/**
 * Read-only tools the assistant is allowed to call.
 * Every tool re-checks the caller's role, so the assistant can never widen someone's access.
 */
export const TOOL_DEFS = [
  {
    name: 'class_strength',
    description: 'Student count, capacity and vacant seats for every class and section, with the institute total.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE', 'ACCOUNTANT'],
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'attendance_today',
    description: 'How many students are present, absent and on leave today across the institute.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE'],
    input_schema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' } },
      required: [],
    },
  },
  {
    name: 'attendance_defaulters',
    description: 'Students below the minimum attendance percentage, lowest first.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER'],
    input_schema: {
      type: 'object',
      properties: { sectionId: { type: 'string', description: 'Optional section filter' } },
      required: [],
    },
  },
  {
    name: 'substitution_board',
    description: 'Which teachers are absent today, which periods need cover and who is covering them.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE'],
    input_schema: { type: 'object', properties: { date: { type: 'string' } }, required: [] },
  },
  {
    name: 'periods_not_marked',
    description: 'Timetable periods for which attendance has not been marked yet.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD'],
    input_schema: { type: 'object', properties: { date: { type: 'string' } }, required: [] },
  },
  {
    name: 'pending_approvals',
    description: 'Counts of pending staff leave applications, attendance corrections and student leave requests.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD'],
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'fee_dues',
    description: 'Outstanding fee balances with ageing buckets, highest overdue first.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'],
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'find_student',
    description: 'Look up a student by name or admission number and return their attendance, assignment, marks and fee summary.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE', 'ACCOUNTANT'],
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Name or admission number' } },
      required: ['query'],
    },
  },
  {
    name: 'teacher_allocation',
    description: 'Which teacher teaches which subject in which section, and who the class teacher is.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE'],
    input_schema: {
      type: 'object',
      properties: { teacherName: { type: 'string' }, subjectName: { type: 'string' } },
      required: [],
    },
  },
  {
    name: 'my_summary',
    description: 'The caller\'s own dashboard: for a student their attendance, assignments, marks and fees; for a teacher their classes and pending work.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'OFFICE'],
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'exam_analysis',
    description: 'Pass percentage, average, grade spread and toppers for the most recent published exam.',
    roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER'],
    input_schema: { type: 'object', properties: { examName: { type: 'string' } }, required: [] },
  },
];

export function toolsFor(role: string) {
  return TOOL_DEFS.filter((t) => t.roles.includes(role)).map(({ roles, ...rest }) => rest);
}

@Injectable()
export class AiToolsService {
  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
    private leaves: LeavesService,
    private academic: AcademicService,
    private dashboard: DashboardService,
  ) {}

  async run(user: AuthUser, name: string, input: any = {}) {
    const def = TOOL_DEFS.find((t) => t.name === name);
    if (!def) return { error: `Unknown tool ${name}` };
    if (!def.roles.includes(user.role)) return { error: 'Your role cannot see this information.' };

    switch (name) {
      case 'class_strength':
        return this.classStrength();
      case 'attendance_today':
        return this.attendance.todaySummary(input.date);
      case 'attendance_defaulters': {
        const d = await this.attendance.defaulters(input.sectionId);
        return { ...d, rows: d.rows.slice(0, 25) };
      }
      case 'substitution_board':
        return this.leaves.board(input.date);
      case 'periods_not_marked':
        return this.attendance.notMarked(input.date);
      case 'pending_approvals':
        return this.pendingApprovals();
      case 'fee_dues': {
        const d = await this.prismaDues();
        return d;
      }
      case 'find_student':
        return this.findStudent(input.query);
      case 'teacher_allocation':
        return this.teacherAllocation(input);
      case 'my_summary':
        return this.dashboard.forUser(user);
      case 'exam_analysis':
        return this.examAnalysis(input.examName);
      default:
        return { error: 'Tool not implemented' };
    }
  }

  private async classStrength() {
    const year = await this.academic.requireActiveYear();
    const sections = await this.prisma.section.findMany({
      where: { academicYearId: year.id },
      include: {
        classLevel: true,
        classTeacher: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ classLevel: { displayOrder: 'asc' } }, { name: 'asc' }],
    });
    return {
      totalStudents: sections.reduce((a, s) => a + s._count.enrollments, 0),
      sections: sections.map((s) => ({
        section: `${s.classLevel.name} ${s.name}`,
        strength: s._count.enrollments,
        capacity: s.capacity,
        vacant: s.capacity - s._count.enrollments,
        classTeacher: s.classTeacher ? `${s.classTeacher.firstName} ${s.classTeacher.lastName}` : 'not assigned',
      })),
    };
  }

  private async pendingApprovals() {
    const [leaves, corrections, studentLeaves, noCT] = await Promise.all([
      this.prisma.leaveApplication.count({ where: { status: 'PENDING' } }),
      this.prisma.attendanceCorrection.count({ where: { status: 'PENDING' } }),
      this.prisma.studentLeave.count({ where: { status: 'PENDING' } }),
      this.academic.sectionsWithoutClassTeacher(),
    ]);
    return {
      staffLeaveApplications: leaves,
      attendanceCorrections: corrections,
      studentLeaveRequests: studentLeaves,
      sectionsWithoutClassTeacher: noCT.length,
    };
  }

  private async prismaDues() {
    const fees = await this.prisma.studentFee.findMany({
      include: { student: true, payments: { where: { isCancelled: false } }, installments: true },
    });
    const rows = fees
      .map((f) => {
        const paid = f.payments.reduce((a, p) => a + p.amount, 0);
        return {
          student: `${f.student.firstName} ${f.student.lastName}`,
          admissionNo: f.student.admissionNo,
          netPayable: f.netPayable,
          paid,
          balance: Math.round((f.netPayable - paid) * 100) / 100,
        };
      })
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.balance - a.balance);
    return {
      studentsWithDues: rows.length,
      totalOutstanding: Math.round(rows.reduce((a, r) => a + r.balance, 0) * 100) / 100,
      top: rows.slice(0, 15),
    };
  }

  private async findStudent(query: string) {
    const year = await this.academic.requireActiveYear();
    const students = await this.prisma.student.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { admissionNo: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        enrollments: {
          where: { academicYearId: year.id },
          include: { section: { include: { classLevel: true } } },
        },
      },
      take: 5,
    });
    if (!students.length) return { found: 0, message: 'No student matched that name or admission number.' };

    const out = [];
    for (const s of students) {
      const [daily, subs, fees] = await Promise.all([
        this.prisma.dailyAttendance.findMany({ where: { studentId: s.id } }),
        this.prisma.assignmentSubmission.findMany({ where: { studentId: s.id } }),
        this.prisma.studentFee.findMany({
          where: { studentId: s.id },
          include: { payments: { where: { isCancelled: false } } },
        }),
      ]);
      const present = daily.filter((d) => ['PRESENT', 'LATE', 'ON_DUTY'].includes(d.status)).length;
      const total = fees.reduce((a, f) => a + f.netPayable, 0);
      const paid = fees.reduce((a, f) => a + f.payments.reduce((x, p) => x + p.amount, 0), 0);
      out.push({
        studentId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNo: s.admissionNo,
        section: s.enrollments[0]
          ? `${s.enrollments[0].section.classLevel.name} ${s.enrollments[0].section.name}`
          : 'not enrolled',
        attendancePct: daily.length ? Math.round((present / daily.length) * 1000) / 10 : null,
        assignmentsPending: subs.filter((x) => x.status === 'PENDING').length,
        assignmentsSubmitted: subs.filter((x) => x.status !== 'PENDING').length,
        feeBalance: Math.round((total - paid) * 100) / 100,
      });
    }
    return { found: out.length, students: out };
  }

  private async teacherAllocation(input: { teacherName?: string; subjectName?: string }) {
    const year = await this.academic.requireActiveYear();
    const rows = await this.prisma.teacherAllocation.findMany({
      where: {
        academicYearId: year.id,
        staff: input.teacherName
          ? {
              OR: [
                { firstName: { contains: input.teacherName, mode: 'insensitive' } },
                { lastName: { contains: input.teacherName, mode: 'insensitive' } },
              ],
            }
          : undefined,
        subject: input.subjectName
          ? { name: { contains: input.subjectName, mode: 'insensitive' } }
          : undefined,
      },
      include: {
        staff: true,
        subject: true,
        section: { include: { classLevel: true, classTeacher: true, _count: { select: { enrollments: true } } } },
      },
      take: 60,
    });
    return {
      count: rows.length,
      allocations: rows.map((r) => ({
        teacher: `${r.staff.firstName} ${r.staff.lastName}`,
        subject: r.subject.name,
        section: `${r.section.classLevel.name} ${r.section.name}`,
        students: r.section._count.enrollments,
        classTeacherOfThatSection: r.section.classTeacher
          ? `${r.section.classTeacher.firstName} ${r.section.classTeacher.lastName}`
          : 'not assigned',
      })),
    };
  }

  private async examAnalysis(examName?: string) {
    const exam = await this.prisma.exam.findFirst({
      where: examName ? { name: { contains: examName, mode: 'insensitive' } } : { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!exam) return { message: 'No exam found. Results may not be published yet.' };

    const results = await this.prisma.result.findMany({
      where: { examId: exam.id },
      include: { student: true },
      orderBy: { rank: 'asc' },
    });
    if (!results.length) return { exam: exam.name, message: 'Results are not processed for this exam yet.' };

    return {
      exam: exam.name,
      status: exam.status,
      appeared: results.length,
      passPct: Math.round((results.filter((r) => r.isPass).length / results.length) * 1000) / 10,
      average: Math.round((results.reduce((a, r) => a + r.percentage, 0) / results.length) * 10) / 10,
      toppers: results.slice(0, 3).map((r) => ({
        name: `${r.student.firstName} ${r.student.lastName}`,
        percentage: r.percentage,
        grade: r.grade,
      })),
      failing: results.filter((r) => !r.isPass).length,
    };
  }
}
