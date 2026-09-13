import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { HallsService } from './halls.service.js';

@Controller('halls')
@UseGuards(AccessTokenGuard)
export class HallsController {
  constructor(private readonly halls: HallsService) {}

  @Get()
  list(@Req() request: Request & AuthenticatedRequest) {
    const auth = request.auth;
    if (!auth || auth.kind !== 'pos-user') throw new ForbiddenException('A staff PIN session is required');
    return this.halls.listForRestaurant(auth.restaurantId);
  }
}
