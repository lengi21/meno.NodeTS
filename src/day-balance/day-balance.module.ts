import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DayBalanceController } from './day-balance.controller.js';
import { DayBalanceService } from './day-balance.service.js';

@Module({ imports: [AuthModule], controllers: [DayBalanceController], providers: [DayBalanceService] })
export class DayBalanceModule {}
