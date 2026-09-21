import { Injectable, Logger } from '@nestjs/common';
import { AiToolsService, toolsFor } from './ai.tools';
import { AuthUser } from '../common/decorators/current-user.decorator';

const API_URL = 'https://api.anthropic.com/v1/messages';

interface ChatTurn { role: 'user' | 'assistant'; content: any }

@Injectable()
export class AiService {
  private readonly log = new Logger('Assistant');

  constructor(private tools: AiToolsService) {}

  get enabled() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private systemPrompt(user: AuthUser) {
    return [
      'You are the built-in assistant of Campus, a school and college management system.',
      `You are talking to ${user.name}, whose role is ${user.role}.`,
      'Answer questions about this institution by calling the tools provided. Never invent numbers:',
      'if a tool did not return a figure, say you do not have it.',
      'Keep answers short and concrete. Use plain language a teacher or clerk would use, not database words.',
      'Money is in INR. Dates are DD-MM-YYYY.',
      'You can only read data. If someone asks you to change, delete or approve something, explain',
      'which screen they should use instead.',
      'If a tool returns an access error, tell the person their role does not allow that, without apologising twice.',
    ].join(' ');
  }

  /** Calls Claude with tool use, looping until it produces a final answer. */
  async chat(user: AuthUser, message: string, history: ChatTurn[] = []) {
    if (!this.enabled) return this.offline(user, message);

    const messages: ChatTurn[] = [...history.slice(-8), { role: 'user', content: message }];
    const toolsUsed: string[] = [];

    for (let hop = 0; hop < 5; hop++) {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: 1200,
          system: this.systemPrompt(user),
          tools: toolsFor(user.role),
          messages,
        }),
      });

      if (!res.ok) {
        const details = (await res.text()).slice(0, 1000);
        this.log.error(`Assistant call failed: ${res.status} ${details}`);
        return this.offline(user, message);
      }

      const data: any = await res.json();
      messages.push({ role: 'assistant', content: data.content });

      const toolUses = (data.content || []).filter((c: any) => c.type === 'tool_use');
      if (!toolUses.length) {
        const text = (data.content || [])
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n')
          .trim();
        return { reply: text || 'I could not find an answer for that.', toolsUsed, history: messages };
      }

      const results = [];
      for (const call of toolUses) {
        toolsUsed.push(call.name);
        const out = await this.tools.run(user, call.name, call.input);
        results.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: JSON.stringify(out).slice(0, 12000),
        });
      }
      messages.push({ role: 'user', content: results });
    }

    return { reply: 'That needed too many lookups. Try asking something narrower.', toolsUsed, history: messages };
  }

  /**
   * Offline assistant. Runs without any API key so the product still works on a
   * school server with no outbound internet: it matches the question to a tool
   * and formats the real data from the database.
   */
  private async offline(user: AuthUser, message: string) {
    const q = message.toLowerCase();
    const pick = (words: string[]) => words.some((w) => q.includes(w));

    let toolName: string | null = null;
    let input: any = {};

    if (pick(['strength', 'how many student', 'total student', 'capacity', 'vacant', 'seats'])) toolName = 'class_strength';
    else if (pick(['absent today', 'attendance today', 'present today', "today's attendance"])) toolName = 'attendance_today';
    else if (pick(['defaulter', 'below 75', 'low attendance', 'short attendance'])) toolName = 'attendance_defaulters';
    else if (pick(['substitut', 'proxy', 'who is taking', 'cover', 'teacher absent'])) toolName = 'substitution_board';
    else if (pick(['not marked', 'pending attendance', 'missing attendance'])) toolName = 'periods_not_marked';
    else if (pick(['pending approval', 'to approve', 'waiting for approval', 'pending leave'])) toolName = 'pending_approvals';
    else if (pick(['due', 'pending fee', 'outstanding', 'unpaid', 'fee collection'])) toolName = 'fee_dues';
    else if (pick(['who teaches', 'allocation', 'which teacher', 'class teacher'])) toolName = 'teacher_allocation';
    else if (pick(['result', 'exam', 'pass percentage', 'topper', 'marks analysis'])) toolName = 'exam_analysis';
    else if (pick(['my ', 'i have', 'me ', 'mine'])) toolName = 'my_summary';

    if (!toolName) {
      return {
        reply: [
          'I can answer questions from your live data. Try one of these:',
          '- How many students are there in each class?',
          '- Who is absent today?',
          '- Show me attendance defaulters',
          '- Which periods need a substitute teacher today?',
          '- What is pending for my approval?',
          '- Who has fee dues?',
          '- Who teaches Mathematics in Class 10?',
        ].join('\n'),
        toolsUsed: [],
        offline: true,
      };
    }

    const data = await this.tools.run(user, toolName, input);
    return { reply: this.formatOffline(toolName, data), toolsUsed: [toolName], offline: true, data };
  }

  private formatOffline(tool: string, d: any): string {
    if (d?.error) return d.error;

    switch (tool) {
      case 'class_strength':
        return [
          `${d.totalStudents} students across ${d.sections.length} sections.`,
          ...d.sections.map(
            (s: any) => `${s.section}: ${s.strength}/${s.capacity} (${s.vacant} vacant) - class teacher ${s.classTeacher}`,
          ),
        ].join('\n');

      case 'attendance_today':
        return d.marked === 0
          ? `No attendance has been marked yet for ${d.date}. ${d.totalStudents} students are enrolled.`
          : `On ${d.date}: ${d.present} present, ${d.absent} absent, ${d.onLeave} on leave. That is ${d.pct}% of the ${d.marked} students marked so far.`;

      case 'attendance_defaulters':
        return d.count === 0
          ? `Nobody is below ${d.minRequired}% right now.`
          : [`${d.count} students are below ${d.minRequired}%:`,
             ...d.rows.slice(0, 10).map((r: any) => `${r.name} (${r.section}) - ${r.pct}%`)].join('\n');

      case 'substitution_board':
        return d.summary.total === 0
          ? `No teacher is on leave on ${d.date}, so no substitution is needed.`
          : [`${d.date}: ${d.summary.total} periods need cover, ${d.summary.covered} already arranged, ${d.summary.needsCover} still open.`,
             ...d.rows.map((r: any) =>
               `Period ${r.periodNo} ${r.section} ${r.subject} - ${r.absentTeacher} absent - ${r.substitute ? `covered by ${r.substitute}` : 'NOT COVERED'}`)].join('\n');

      case 'periods_not_marked':
        return d.rows.length === 0
          ? `Every period has attendance marked for ${d.date}.`
          : [`${d.rows.length} periods without attendance on ${d.date}:`,
             ...d.rows.map((r: any) => `Period ${r.periodNo} ${r.section} ${r.subject} - ${r.teacher}`)].join('\n');

      case 'pending_approvals':
        return [
          `${d.staffLeaveApplications} staff leave applications waiting`,
          `${d.attendanceCorrections} attendance corrections waiting`,
          `${d.studentLeaveRequests} student leave requests waiting`,
          d.sectionsWithoutClassTeacher ? `${d.sectionsWithoutClassTeacher} sections still have no class teacher` : null,
        ].filter(Boolean).join('\n');

      case 'fee_dues':
        return d.studentsWithDues === 0
          ? 'No fee dues are outstanding.'
          : [`${d.studentsWithDues} students owe INR ${d.totalOutstanding.toLocaleString('en-IN')} in total.`,
             ...d.top.slice(0, 8).map((r: any) => `${r.student} (${r.admissionNo}) - INR ${r.balance.toLocaleString('en-IN')}`)].join('\n');

      case 'teacher_allocation':
        return d.count === 0
          ? 'No allocation matched that.'
          : d.allocations.slice(0, 15)
              .map((a: any) => `${a.teacher} teaches ${a.subject} to ${a.section} (${a.students} students)`)
              .join('\n');

      case 'exam_analysis':
        if (d.message) return d.message;
        return [
          `${d.exam}: ${d.appeared} appeared, ${d.passPct}% passed, average ${d.average}%.`,
          `Toppers: ${d.toppers.map((t: any) => `${t.name} (${t.percentage}%)`).join(', ')}`,
          d.failing ? `${d.failing} students did not pass.` : 'Everyone passed.',
        ].join('\n');

      case 'my_summary':
        if (d.role === 'STUDENT')
          return `Your attendance is ${d.attendance.pct}% (minimum ${d.attendance.minRequired}%). ${d.pendingAssignments.length} assignments pending. Fee balance INR ${d.fees.balance}.`;
        if (d.role === 'TEACHER')
          return `You teach ${d.cards.subjects} subjects to ${d.cards.sections} sections, ${d.cards.students} students in all. Today you have ${d.cards.periodsToday} periods, ${d.needsAttention.attendancePending} still need attendance.`;
        return JSON.stringify(d.cards);

      default:
        return JSON.stringify(d).slice(0, 1500);
    }
  }
}
