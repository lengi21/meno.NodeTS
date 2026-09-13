import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { DayBalanceService } from './day-balance.service.js';

@Controller('day-balance')
@UseGuards(AccessTokenGuard)
export class DayBalanceController {
  constructor(private readonly dayBalance: DayBalanceService) {}
  @Get() get(@Req() request: Request & AuthenticatedRequest) {
    const auth = request.auth;
    if (!auth || auth.kind !== 'pos-user') throw new ForbiddenException('A staff PIN session is required');
    return this.dayBalance.current(auth.restaurantId);
  }
}
