import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { HallsController } from './halls.controller.js';
import { HallsService } from './halls.service.js';
import { ChequeCalculationService } from '../tables/cheque-calculation.service.js';

@Module({
  imports: [AuthModule],
  controllers: [HallsController],
  providers: [HallsService, ChequeCalculationService],
})
export class HallsModule {}
