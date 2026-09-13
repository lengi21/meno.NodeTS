import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { HallsModule } from './halls/halls.module.js';
import { TablesModule } from './tables/tables.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrintersModule } from './printers/printers.module.js';
import { DayBalanceModule } from './day-balance/day-balance.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, HealthModule, AuthModule, HallsModule, TablesModule, PrintersModule, DayBalanceModule],
})
export class AppModule {}
