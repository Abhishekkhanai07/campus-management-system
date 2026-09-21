/**
 * Demo data for Campus.
 * Creates one institute, one academic year, 3 classes x 2 sections, subjects,
 * teachers with allocations and class-teacher duty, a full timetable, 30 days of
 * attendance, assignments, one published exam, fees with payments, a leave that
 * has already generated substitutions, and one login for every role.
 *
 * Run: npm run seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Campus@123';

const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Ananya', 'Diya', 'Ishaan', 'Kabir', 'Myra', 'Reyansh', 'Saanvi',
  'Arjun', 'Anika', 'Vihaan', 'Riya', 'Sai', 'Tara', 'Dhruv', 'Meera', 'Krish', 'Zara',
  'Rohan', 'Neha', 'Kunal', 'Pooja', 'Aryan', 'Sneha', 'Varun', 'Isha', 'Nikhil', 'Kavya'];
const LAST = ['Sharma', 'Patil', 'Deshmukh', 'Joshi', 'Kulkarni', 'Iyer', 'Nair', 'Reddy', 'Gupta', 'Mehta'];

const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];
const dateOnly = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return dateOnly(x);
};

async function main() {
  console.log('Clearing old data...');
  // order matters because of foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeInstallment.deleteMany();
  await prisma.studentFee.deleteMany();
  await prisma.feeStructureItem.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.feeHead.deleteMany();
  await prisma.result.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.examSchedule.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.substitution.deleteMany();
  await prisma.leaveApplication.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.studentLeave.deleteMany();
  await prisma.attendanceCorrection.deleteMany();
  await prisma.periodAttendance.deleteMany();
  await prisma.dailyAttendance.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.teacherAllocation.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.section.deleteMany();
  await prisma.classLevel.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.department.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institute.deleteMany();
  await prisma.gradeBand.deleteMany();

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('Institute and academic year...');
  await prisma.institute.create({
    data: {
      name: 'Sunrise Vidyalaya & Junior College',
      type: 'SCHOOL',
      board: 'State Board (Maharashtra)',
      code: 'UDISE-27250100123',
      address: 'Baner Road, Pune 411045',
      phone: '+91 20 4000 1234',
      email: 'office@sunrisevidyalaya.edu.in',
      minAttendancePct: 75,
      attendanceEditWindowHrs: 24,
    },
  });

  const year = await prisma.academicYear.create({
    data: {
      name: '2026-27',
      startDate: new Date(Date.UTC(2026, 5, 15)),
      endDate: new Date(Date.UTC(2027, 3, 30)),
      isActive: true,
    },
  });

  const science = await prisma.department.create({ data: { name: 'Science', code: 'SCI' } });
  const arts = await prisma.department.create({ data: { name: 'Languages & Humanities', code: 'HUM' } });

  console.log('Subjects and classes...');
  const subjectSeed = [
    { code: 'MTH', name: 'Mathematics', dept: science.id, pass: 35 },
    { code: 'SCI', name: 'Science', dept: science.id, pass: 35 },
    { code: 'ENG', name: 'English', dept: arts.id, pass: 35 },
    { code: 'MAR', name: 'Marathi', dept: arts.id, pass: 35 },
    { code: 'SST', name: 'Social Studies', dept: arts.id, pass: 35 },
    { code: 'CS', name: 'Computer Science', dept: science.id, pass: 40 },
  ];
  const subjects = [];
  for (const s of subjectSeed) {
    subjects.push(
      await prisma.subject.create({
        data: { code: s.code, name: s.name, departmentId: s.dept, maxMarks: 100, passMarks: s.pass, credits: 4 },
      }),
    );
  }

  const classes = [];
  for (const [i, name] of ['Class 8', 'Class 9', 'Class 10'].entries()) {
    classes.push(
      await prisma.classLevel.create({
        data: { name, displayOrder: i + 1, departmentId: science.id, minAttendancePct: 75 },
      }),
    );
  }
  for (const c of classes) {
    for (const s of subjects) {
      await prisma.classSubject.create({
        data: { classLevelId: c.id, subjectId: s.id, periodsPerWeek: 5 },
      });
    }
  }

  console.log('Staff...');
  const leaveTypes = [];
  for (const t of [
    { name: 'Casual Leave', annualQuota: 12 },
    { name: 'Sick Leave', annualQuota: 10 },
    { name: 'Earned Leave', annualQuota: 15 },
    { name: 'Duty Leave', annualQuota: 10 },
    { name: 'Loss of Pay', annualQuota: 0, isPaid: false },
  ]) {
    leaveTypes.push(await prisma.leaveType.create({ data: t as any }));
  }

  async function makeStaff(
    firstName: string, lastName: string, role: any, designation: string, deptId?: string, isTeaching = true,
  ) {
    const count = await prisma.staff.count();
    const employeeCode = `EMP${String(count + 1).padStart(4, '0')}`;
    const staff = await prisma.staff.create({
      data: {
        employeeCode, firstName, lastName, designation,
        department: deptId ? { connect: { id: deptId } } : undefined,
        isTeaching,
        phone: `+9198${Math.floor(10000000 + Math.random() * 89999999)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@sunrisevidyalaya.edu.in`,
        qualification: isTeaching ? 'M.Sc., B.Ed.' : 'B.Com.',
        user: { create: { loginId: employeeCode, role, passwordHash: hash, mustChangePassword: false } },
      },
    });
    const yr = new Date().getFullYear();
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: { staffId: staff.id, leaveTypeId: lt.id, year: yr, opening: lt.annualQuota, availed: 0 },
      });
    }
    return staff;
  }

  // super admin (not a teacher)
  await prisma.user.create({
    data: { loginId: 'superadmin', role: 'SUPER_ADMIN', passwordHash: hash, mustChangePassword: false, email: 'it@sunrisevidyalaya.edu.in' },
  });

  const principal = await makeStaff('Meenakshi', 'Rao', 'ADMIN', 'Principal', science.id, false);
  const hod = await makeStaff('Sanjay', 'Kulkarni', 'HOD', 'Head of Science', science.id);
  const accountant = await makeStaff('Prakash', 'Shinde', 'ACCOUNTANT', 'Accounts Officer', undefined, false);
  await makeStaff('Vaishali', 'More', 'OFFICE', 'Office Superintendent', undefined, false);

  const teacherSeed = [
    ['Anjali', 'Deshpande', science.id],
    ['Ramesh', 'Pawar', science.id],
    ['Sunita', 'Jadhav', arts.id],
    ['Farhan', 'Shaikh', arts.id],
    ['Neelam', 'Chavan', science.id],
    ['Vikram', 'Salunkhe', arts.id],
    ['Pooja', 'Bhosale', science.id],
    ['Amit', 'Gaikwad', arts.id],
  ];
  const teachers = [hod];
  for (const [f, l, d] of teacherSeed) {
    teachers.push(await makeStaff(f as string, l as string, 'TEACHER', 'Assistant Teacher', d as string));
  }

  console.log('Sections with class teachers...');
  const sections = [];
  let tIdx = 0;
  for (const c of classes) {
    for (const name of ['A', 'B']) {
      sections.push(
        await prisma.section.create({
          data: {
            name,
            classLevelId: c.id,
            academicYearId: year.id,
            capacity: 40,
            room: `R-${c.displayOrder}0${name === 'A' ? 1 : 2}`,
            classTeacherId: teachers[tIdx % teachers.length].id,
          },
          include: { classLevel: true },
        }),
      );
      tIdx++;
    }
  }

  console.log('Subject allocation...');
  for (const [si, section] of sections.entries()) {
    for (const [sj, subject] of subjects.entries()) {
      const teacher = teachers[(si + sj) % teachers.length];
      await prisma.teacherAllocation.create({
        data: {
          staffId: teacher.id,
          subjectId: subject.id,
          sectionId: section.id,
          academicYearId: year.id,
        },
      });
    }
  }

  console.log('Timetable...');
  const periodTimes = [
    ['09:00', '09:45'], ['09:45', '10:30'], ['10:45', '11:30'],
    ['11:30', '12:15'], ['13:00', '13:45'], ['13:45', '14:30'],
  ];
  for (const section of sections) {
    const allocs = await prisma.teacherAllocation.findMany({
      where: { sectionId: section.id, academicYearId: year.id },
    });
    for (let weekday = 1; weekday <= 5; weekday++) {
      for (let p = 0; p < periodTimes.length; p++) {
        const alloc = allocs[(weekday + p) % allocs.length];
        // skip if that teacher is already booked in this slot somewhere else
        const clash = await prisma.timetableSlot.findFirst({
          where: { staffId: alloc.staffId, weekday, periodNo: p + 1 },
        });
        if (clash) continue;
        await prisma.timetableSlot.create({
          data: {
            sectionId: section.id,
            subjectId: alloc.subjectId,
            staffId: alloc.staffId,
            weekday,
            periodNo: p + 1,
            startTime: periodTimes[p][0],
            endTime: periodTimes[p][1],
            room: section.room,
          },
        });
      }
    }
  }

  console.log('Students, guardians and logins...');
  const students = [];
  let n = 0;
  for (const section of sections) {
    const strength = 18 + (n % 5); // 18-22 per section
    for (let i = 0; i < strength; i++) {
      n++;
      const firstName = pick(FIRST, n * 3 + i);
      const lastName = pick(LAST, n + i);
      const admissionNo = `ADM2026${String(n).padStart(4, '0')}`;
      const gender = n % 2 === 0 ? 'FEMALE' : 'MALE';

      const student = await prisma.student.create({
        data: {
          admissionNo,
          firstName,
          lastName,
          gender,
          dob: new Date(Date.UTC(2011 - (section.classLevel.displayOrder || 1), (n % 12), ((n % 27) + 1))),
          bloodGroup: pick(['A+', 'B+', 'O+', 'AB+'], n),
          category: pick(['GEN', 'OBC', 'SC', 'ST', 'EWS'], n),
          phone: `+9197${Math.floor(10000000 + Math.random() * 89999999)}`,
          user: { create: { loginId: admissionNo, role: 'STUDENT', passwordHash: hash, mustChangePassword: false } },
          enrollments: { create: { sectionId: section.id, academicYearId: year.id, rollNo: i + 1 } },
        },
      });

      // parent login for the first student of each section
      if (i === 0) {
        await prisma.guardian.create({
          data: {
            student: { connect: { id: student.id } },
            name: `${pick(['Suresh', 'Mahesh', 'Ganesh', 'Rajesh'], n)} ${lastName}`,
            relation: 'FATHER',
            phone: `+9196${Math.floor(10000000 + Math.random() * 89999999)}`,
            isPrimary: true,
            user: {
              create: {
                loginId: `parent${sections.indexOf(section) + 1}`,
                role: 'PARENT',
                passwordHash: hash,
                mustChangePassword: false,
              },
            },
          },
        });
      } else {
        await prisma.guardian.create({
          data: {
            student: { connect: { id: student.id } },
            name: `${pick(['Suresh', 'Mahesh', 'Ganesh', 'Rajesh'], n + i)} ${lastName}`,
            relation: 'FATHER',
            phone: `+9196${Math.floor(10000000 + Math.random() * 89999999)}`,
            isPrimary: true,
          },
        });
      }

      students.push({ ...student, sectionId: section.id });
    }
  }
  console.log(`  ${students.length} students created`);

  console.log('Attendance for the last 30 working days...');
  const todayD = dateOnly(new Date());
  const workingDays: Date[] = [];
  for (let i = 1; workingDays.length < 30 && i < 60; i++) {
    const d = addDays(todayD, -i);
    const wd = d.getUTCDay();
    if (wd !== 0) workingDays.push(d);
  }

  for (const d of workingDays) {
    const rows = students.map((s, idx) => {
      const r = (idx * 7 + d.getUTCDate() * 3) % 100;
      // roughly 88% present, 8% absent, 4% leave — a few students are made poor attenders
      const poor = idx % 17 === 0;
      const status = poor
        ? r < 55 ? 'PRESENT' : r < 90 ? 'ABSENT' : 'ON_LEAVE'
        : r < 88 ? 'PRESENT' : r < 96 ? 'ABSENT' : 'ON_LEAVE';
      return { studentId: s.id, date: d, status: status as any };
    });
    await prisma.dailyAttendance.createMany({ data: rows, skipDuplicates: true });
  }

  // period attendance for the last 10 working days
  const slots = await prisma.timetableSlot.findMany();
  for (const d of workingDays.slice(0, 10)) {
    const wd = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    const daySlots = slots.filter((s) => s.weekday === wd);
    for (const slot of daySlots) {
      const sectionStudents = students.filter((s) => s.sectionId === slot.sectionId);
      await prisma.periodAttendance.createMany({
        data: sectionStudents.map((s, idx) => ({
          studentId: s.id,
          slotId: slot.id,
          subjectId: slot.subjectId,
          date: d,
          status: ((idx * 5 + slot.periodNo + d.getUTCDate()) % 100 < 90 ? 'PRESENT' : 'ABSENT') as any,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.log('Assignments...');
  const allocations = await prisma.teacherAllocation.findMany({ take: 12 });
  for (const [i, a] of allocations.entries()) {
    const due = addDays(todayD, i % 3 === 0 ? -3 : 4);
    const assignment = await prisma.assignment.create({
      data: {
        title: pick(
          ['Chapter 4 exercise', 'Practical write-up', 'Essay: My favourite scientist', 'Worksheet 2',
           'Map work', 'Programming task 1'], i),
        description: 'Complete the questions and submit before the due date.',
        subjectId: a.subjectId,
        sectionId: a.sectionId,
        staffId: a.staffId,
        dueDate: due,
        maxMarks: 10,
      },
    });
    const secStudents = students.filter((s) => s.sectionId === a.sectionId);
    await prisma.assignmentSubmission.createMany({
      data: secStudents.map((s, idx) => {
        const submitted = (idx + i) % 4 !== 0;
        const late = submitted && (idx + i) % 7 === 0;
        return {
          assignmentId: assignment.id,
          studentId: s.id,
          status: submitted ? (late ? ('LATE' as any) : ('SUBMITTED' as any)) : ('PENDING' as any),
          isLate: late,
          submittedAt: submitted ? addDays(due, late ? 1 : -1) : null,
        };
      }),
    });
  }

  console.log('Examination with published results...');
  const exam = await prisma.exam.create({
    data: {
      name: 'First Unit Test',
      type: 'UNIT_TEST',
      academicYearId: year.id,
      weightagePct: 20,
      status: 'PUBLISHED',
      publishAt: new Date(),
    },
  });

  for (const [si, s] of students.entries()) {
    for (const [sj, sub] of subjects.entries()) {
      const base = 35 + ((si * 13 + sj * 7) % 60);
      await prisma.mark.create({
        data: {
          examId: exam.id,
          studentId: s.id,
          subjectId: sub.id,
          marksObtained: base,
          maxMarks: 100,
          status: 'PRESENT',
          isLocked: true,
        },
      });
    }
  }

  // process results
  const allMarks = await prisma.mark.findMany({ where: { examId: exam.id }, include: { subject: true } });
  const byStudent = new Map<string, typeof allMarks>();
  for (const m of allMarks) {
    const arr = byStudent.get(m.studentId) || [];
    arr.push(m);
    byStudent.set(m.studentId, arr);
  }
  const computed = Array.from(byStudent.entries()).map(([studentId, rows]) => {
    const total = rows.reduce((a, r) => a + (r.marksObtained || 0), 0);
    const maxTotal = rows.reduce((a, r) => a + r.maxMarks, 0);
    const percentage = Math.round((total / maxTotal) * 1000) / 10;
    const isPass = rows.every((r) => (r.marksObtained || 0) >= r.subject.passMarks);
    const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+'
      : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 35 ? 'D' : 'F';
    return { studentId, total, maxTotal, percentage, isPass, grade };
  }).sort((a, b) => b.percentage - a.percentage);

  for (const [i, c] of computed.entries()) {
    await prisma.result.create({ data: { examId: exam.id, ...c, rank: i + 1, publishedAt: new Date() } });
  }

  console.log('Fees...');
  const heads = [];
  for (const name of ['Tuition Fee', 'Admission Fee', 'Examination Fee', 'Laboratory Fee', 'Library Fee']) {
    heads.push(await prisma.feeHead.create({ data: { name } }));
  }
  const amounts = [24000, 5000, 2000, 3000, 1000];

  for (const c of classes) {
    const structure = await prisma.feeStructure.create({
      data: {
        name: `${c.name} fee ${year.name}`,
        classLevelId: c.id,
        academicYearId: year.id,
        items: { create: heads.map((h, i) => ({ feeHeadId: h.id, amount: amounts[i] })) },
      },
    });
    const total = amounts.reduce((a, b) => a + b, 0);

    const classSections = sections.filter((s) => s.classLevelId === c.id);
    const classStudents = students.filter((s) => classSections.some((cs) => cs.id === s.sectionId));

    for (const [i, st] of classStudents.entries()) {
      const concession = i % 11 === 0 ? 5000 : 0;
      const net = total - concession;
      const sf = await prisma.studentFee.create({
        data: {
          studentId: st.id,
          feeStructureId: structure.id,
          totalAmount: total,
          concession,
          concessionNote: concession ? 'Staff ward concession' : null,
          netPayable: net,
          installments: {
            create: [
              { seq: 1, amount: net / 2, dueDate: addDays(todayD, -20) },
              { seq: 2, amount: net / 2, dueDate: addDays(todayD, 70) },
            ],
          },
        },
        include: { installments: true },
      });

      // 70% have paid the first installment, 15% paid in full, 15% have paid nothing
      const bucket = i % 20;
      if (bucket < 3) continue;
      const payFull = bucket >= 17;
      const amount = payFull ? net : net / 2;
      const count = await prisma.feePayment.count();
      await prisma.feePayment.create({
        data: {
          studentFeeId: sf.id,
          receiptNo: `RCP2026${String(count + 1).padStart(5, '0')}`,
          amount,
          mode: pick(['CASH', 'UPI', 'NETBANKING', 'CHEQUE'], i) as any,
          paidAt: addDays(todayD, -(i % 25)),
        },
      });
      await prisma.feeInstallment.update({
        where: { id: sf.installments[0].id },
        data: { paidAmount: payFull ? sf.installments[0].amount : amount },
      });
      if (payFull) {
        await prisma.feeInstallment.update({
          where: { id: sf.installments[1].id },
          data: { paidAmount: sf.installments[1].amount },
        });
      }
    }
  }

  console.log('A leave with substitutions already generated...');
  const absentTeacher = teachers[2];
  const leaveApp = await prisma.leaveApplication.create({
    data: {
      staffId: absentTeacher.id,
      leaveTypeId: leaveTypes[1].id,
      fromDate: todayD,
      toDate: todayD,
      reason: 'Fever, advised rest for the day',
      status: 'APPROVED',
      decidedAt: new Date(),
    },
  });
  const wdToday = todayD.getUTCDay() === 0 ? 7 : todayD.getUTCDay();
  const affected = await prisma.timetableSlot.findMany({
    where: { staffId: absentTeacher.id, weekday: wdToday },
  });
  for (const [i, slot] of affected.entries()) {
    await prisma.substitution.create({
      data: {
        date: todayD,
        slotId: slot.id,
        absentStaffId: absentTeacher.id,
        leaveApplicationId: leaveApp.id,
        // leave the last one open so the demo shows a period that still needs cover
        substituteStaffId: i < affected.length - 1 ? teachers[(i + 4) % teachers.length].id : null,
        status: i < affected.length - 1 ? 'ASSIGNED' : 'NEEDS_COVER',
      },
    });
  }

  // one pending leave so the approval screen is not empty
  await prisma.leaveApplication.create({
    data: {
      staffId: teachers[5].id,
      leaveTypeId: leaveTypes[0].id,
      fromDate: addDays(todayD, 2),
      toDate: addDays(todayD, 3),
      reason: 'Family function out of station',
      status: 'PENDING',
    },
  });

  console.log('Notices...');
  await prisma.notice.createMany({
    data: [
      { title: 'Parent-teacher meeting on Saturday', body: 'The meeting for Classes 8 to 10 is on Saturday between 9 am and 1 pm. Please meet the class teacher first.', audience: 'ALL' },
      { title: 'Unit test results published', body: 'First unit test results are now visible in the portal. Report cards can be downloaded from the results page.', audience: 'ALL' },
      { title: 'Staff meeting Friday 4 pm', body: 'All teaching staff to attend the academic review in the conference room.', audience: 'STAFF' },
    ],
  });

  console.log('\nDone. Demo logins (password for all: ' + DEMO_PASSWORD + '):');
  console.table([
    { role: 'Super Admin', loginId: 'superadmin' },
    { role: 'Principal / Admin', loginId: principal.employeeCode },
    { role: 'HOD', loginId: hod.employeeCode },
    { role: 'Teacher (class teacher)', loginId: teachers[1].employeeCode },
    { role: 'Teacher (on leave today)', loginId: absentTeacher.employeeCode },
    { role: 'Accountant', loginId: accountant.employeeCode },
    { role: 'Student', loginId: students[0].admissionNo },
    { role: 'Parent', loginId: 'parent1' },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
