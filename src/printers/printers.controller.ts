import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { SavePrinterDto } from './dto/save-printer.dto.js';
import { PrintersService } from './printers.service.js';

@Controller('printers')
@UseGuards(AccessTokenGuard)
export class PrintersController {
  constructor(private readonly printers: PrintersService) {}

  @Get()
  list(@Req() request: Request & AuthenticatedRequest) { return this.printers.list(this.auth(request)); }

  @Post()
  save(@Body() dto: SavePrinterDto, @Req() request: Request & AuthenticatedRequest) { return this.printers.save(this.auth(request), dto); }

  private auth(request: Request & AuthenticatedRequest): string {
    const auth = request.auth;
    if (!auth || auth.kind !== 'pos-user') throw new ForbiddenException('A staff PIN session is required');
    return auth.restaurantId;
  }
}
