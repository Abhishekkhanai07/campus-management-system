import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import {
  AllocateDto, AssignClassTeacherDto, CreateAcademicYearDto, CreateClassDto, CreateDepartmentDto,
  CreateSectionDto, CreateSubjectDto, HolidayDto, MapClassSubjectDto, SlotDto,
} from './dto';

@Controller('academic')
export class AcademicController {
  constructor(private svc: AcademicService) {}

  @Get('institute') institute() { return this.svc.institute(); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'UPDATE_INSTITUTE', entity: 'Institute' })
  @Patch('institute') updateInstitute(@Body() body: any) { return this.svc.updateInstitute(body); }

  @Get('years') years() { return this.svc.years(); }
  @Get('years/active') activeYear() { return this.svc.activeYear(); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'CREATE_YEAR', entity: 'AcademicYear' })
  @Post('years') createYear(@Body() dto: CreateAcademicYearDto) { return this.svc.createYear(dto); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'ACTIVATE_YEAR', entity: 'AcademicYear' })
  @Patch('years/:id/activate') activateYear(@Param('id') id: string) { return this.svc.activateYear(id); }

  @Get('departments') departments() { return this.svc.departments(); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'CREATE_DEPARTMENT', entity: 'Department' })
  @Post('departments') createDepartment(@Body() dto: CreateDepartmentDto) { return this.svc.createDepartment(dto); }

  @Get('classes') classes() { return this.svc.classes(); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'CREATE_CLASS', entity: 'ClassLevel' })
  @Post('classes') createClass(@Body() dto: CreateClassDto) { return this.svc.createClass(dto); }

  @Get('sections') sections() { return this.svc.sections(); }
  @Get('sections/without-class-teacher') noCT() { return this.svc.sectionsWithoutClassTeacher(); }
  @Get('sections/:id') section(@Param('id') id: string) { return this.svc.sectionDetail(id); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'CREATE_SECTION', entity: 'Section' })
  @Post('sections') createSection(@Body() dto: CreateSectionDto) { return this.svc.createSection(dto); }

  @Roles('ADMIN')
  @Audit({ module: 'ALLOCATION', action: 'ASSIGN_CLASS_TEACHER', entity: 'Section' })
  @Patch('sections/:id/class-teacher')
  assignCT(@Param('id') id: string, @Body() dto: AssignClassTeacherDto) {
    return this.svc.assignClassTeacher(id, dto.staffId);
  }

  @Get('subjects') subjects() { return this.svc.subjects(); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'CREATE_SUBJECT', entity: 'Subject' })
  @Post('subjects') createSubject(@Body() dto: CreateSubjectDto) { return this.svc.createSubject(dto); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'MAP_CLASS_SUBJECT', entity: 'ClassSubject' })
  @Post('class-subjects') mapClassSubject(@Body() dto: MapClassSubjectDto) { return this.svc.mapClassSubject(dto); }

  @Get('allocations')
  allocations(@Query('staffId') staffId?: string, @Query('sectionId') sectionId?: string) {
    return this.svc.allocations({ staffId, sectionId });
  }

  @Get('allocations/matrix') matrix() { return this.svc.allocationMatrix(); }

  @Roles('ADMIN', 'HOD')
  @Audit({ module: 'ALLOCATION', action: 'ALLOCATE_SUBJECT', entity: 'TeacherAllocation' })
  @Post('allocations') allocate(@Body() dto: AllocateDto) { return this.svc.allocate(dto); }

  @Roles('ADMIN', 'HOD')
  @Audit({ module: 'ALLOCATION', action: 'REMOVE_ALLOCATION', entity: 'TeacherAllocation' })
  @Delete('allocations/:id') removeAllocation(@Param('id') id: string) { return this.svc.removeAllocation(id); }

  @Get('timetable')
  timetable(@Query('sectionId') sectionId?: string, @Query('staffId') staffId?: string) {
    return this.svc.timetable({ sectionId, staffId });
  }

  @Roles('ADMIN', 'HOD')
  @Audit({ module: 'TIMETABLE', action: 'CREATE_SLOT', entity: 'TimetableSlot' })
  @Post('timetable') createSlot(@Body() dto: SlotDto) { return this.svc.createSlot(dto); }

  @Roles('ADMIN', 'HOD')
  @Audit({ module: 'TIMETABLE', action: 'DELETE_SLOT', entity: 'TimetableSlot' })
  @Delete('timetable/:id') deleteSlot(@Param('id') id: string) { return this.svc.deleteSlot(id); }

  @Get('holidays') holidays() { return this.svc.holidays(); }

  @Roles('ADMIN')
  @Audit({ module: 'SETUP', action: 'ADD_HOLIDAY', entity: 'Holiday' })
  @Post('holidays') addHoliday(@Body() dto: HolidayDto) { return this.svc.addHoliday(dto); }
}
