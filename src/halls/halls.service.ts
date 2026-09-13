import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class HallsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForRestaurant(restaurantId: string) {
    const halls = await this.prisma.hall.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            cheques: {
              where: { status: { in: ['OPEN', 'READY_TO_CLOSE'] } },
              orderBy: { openedAt: 'desc' },
              take: 1,
              include: { items: { where: { status: { not: 'VOIDED' } } } },
            },
          },
        },
      },
    });

    return halls.map((hall) => ({
      id: hall.id,
      name: hall.name,
      sortOrder: hall.sortOrder,
      tables: hall.tables.map((table) => {
        const cheque = table.cheques[0];
        const total = cheque?.items.reduce(
          (sum, item) => sum + Number(item.unitPrice) * item.quantity,
          0,
        ) ?? 0;
        return {
          id: table.id,
          name: table.name,
          status: !cheque ? 'AVAILABLE' : cheque.status === 'READY_TO_CLOSE' ? 'ADVANCE_PRINTED' : 'OCCUPIED',
          chequeNumber: cheque?.sequenceNumber ?? null,
          total,
        };
      }),
    }));
  }
}
