import { Body, Controller, Get, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { toolsFor } from './ai.tools';

@Controller('assistant')
export class AiController {
  constructor(private ai: AiService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return {
      mode: this.ai.enabled ? 'claude' : 'offline',
      availableTools: toolsFor(user.role).map((t) => t.name),
      suggestions: suggestionsFor(user.role),
    };
  }

  @Post('chat')
  chat(
    @CurrentUser() user: AuthUser,
    @Body() body: { message: string; history?: any[] },
  ) {
    return this.ai.chat(user, body.message, body.history || []);
  }
}

function suggestionsFor(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return [
        'How many students are in each class?',
        'Which periods have no attendance today?',
        'Who is covering the absent teachers today?',
        'What is waiting for my approval?',
        'Who has fee dues?',
      ];
    case 'HOD':
      return ['Show attendance defaulters', 'Who teaches Mathematics?', 'What is pending for approval?'];
    case 'TEACHER':
      return ['What do I have today?', 'Show attendance defaulters in my class', 'Who has not submitted the last assignment?'];
    case 'STUDENT':
      return ['What is my attendance?', 'What assignments are pending?', 'What are my fee dues?'];
    case 'PARENT':
      return ['How is my child attending?', 'Any pending assignments?', 'What fees are due?'];
    case 'ACCOUNTANT':
      return ['How much was collected today?', 'Who has fee dues?'];
    default:
      return ['How many students are enrolled?'];
  }
}
