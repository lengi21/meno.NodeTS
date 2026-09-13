import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SavePrinterDto } from './dto/save-printer.dto.js';

@Injectable()
export class PrintersService {
  constructor(private readonly prisma: PrismaService) {}

  list(restaurantId: string) {
    return this.prisma.printer.findMany({ where: { restaurantId }, orderBy: { name: 'asc' }, include: { routes: true } });
  }

  save(restaurantId: string, dto: SavePrinterDto) {
    return this.prisma.printer.upsert({
      where: { restaurantId_name: { restaurantId, name: dto.name } },
      update: { connection: dto.connection, address: dto.address?.trim() || null, paperWidthMm: dto.paperWidthMm ?? 80, isActive: true },
      create: { restaurantId, name: dto.name, connection: dto.connection, address: dto.address?.trim() || null, paperWidthMm: dto.paperWidthMm ?? 80 },
      include: { routes: true },
    });
  }
}
