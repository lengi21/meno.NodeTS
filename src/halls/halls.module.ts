import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { HallsController } from './halls.controller.js';
import { HallsService } from './halls.service.js';

@Module({
  imports: [AuthModule],
  controllers: [HallsController],
  providers: [HallsService],
})
export class HallsModule {}
