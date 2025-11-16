import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CalendarService, CreateEventDto, UpdateEventDto, ListEventsFilters } from '../services/calendar.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * List calendar events
   * GET /api/calendar/events
   */
  @Get('events')
  @SkipThrottle()
  async listEvents(
    @Req() req: any,
    @Query('providerId') providerId?: string,
    @Query('calendarId') calendarId?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tenantId = req.user.tenantId;

    const filters: ListEventsFilters = {
      providerId,
      calendarId,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.calendarService.listEvents(tenantId, filters);
  }

  /**
   * Get a single calendar event
   * GET /api/calendar/events/:id
   */
  @Get('events/:id')
  @SkipThrottle()
  async getEvent(@Req() req: any, @Param('id') eventId: string) {
    const tenantId = req.user.tenantId;
    return this.calendarService.getEvent(tenantId, eventId);
  }

  /**
   * Create a new calendar event
   * POST /api/calendar/events
   */
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Req() req: any, @Body() data: CreateEventDto) {
    const tenantId = req.user.tenantId;
    return this.calendarService.createEvent(tenantId, data);
  }

  /**
   * Update a calendar event
   * PATCH /api/calendar/events/:id
   */
  @Patch('events/:id')
  async updateEvent(
    @Req() req: any,
    @Param('id') eventId: string,
    @Body() data: UpdateEventDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.calendarService.updateEvent(tenantId, eventId, data);
  }

  /**
   * Delete a calendar event
   * DELETE /api/calendar/events/:id
   */
  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Req() req: any, @Param('id') eventId: string) {
    const tenantId = req.user.tenantId;
    await this.calendarService.deleteEvent(tenantId, eventId);
  }

  /**
   * Trigger manual sync for a provider's calendars
   * POST /api/calendar/sync/:providerId
   */
  @Post('sync/:providerId')
  async syncProvider(@Req() req: any, @Param('providerId') providerId: string) {
    const tenantId = req.user.tenantId;
    return this.calendarService.syncProvider(tenantId, providerId);
  }
}
