import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user performance metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  async getUserMetrics(@Param('userId') userId: string) {
    return this.metricsService.getUserMetrics(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard data' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  async getLeaderboard() {
    return this.metricsService.getLeaderboard();
  }
}
