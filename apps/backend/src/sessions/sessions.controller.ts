import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new workout session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(@Body() createSessionDto: any) {
    return this.sessionsService.create(createSessionDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session found' })
  async getSession(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }
}
