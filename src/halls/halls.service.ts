import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChequeCalculationService } from '../tables/cheque-calculation.service.js';

@Injectable()
export class HallsService {
  constructor(private readonly prisma: PrismaService, private readonly calculations: ChequeCalculationService) {}

  async listForRestaurant(restaurantId: string) {
    const halls = await this.prisma.hall.findMany({
      where: { restaurantId, isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          where: { isActive: true, deletedAt: null },
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

    return Promise.all(halls.map(async (hall) => ({
      id: hall.id,
      name: hall.name,
      sortOrder: hall.sortOrder,
      tables: await Promise.all(hall.tables.map(async (table) => {
        const cheque = table.cheques[0];
        const calculation = cheque ? await this.calculations.calculate(cheque.id, restaurantId) : { subtotal: 0, serviceFee: 0, discount: 0, total: 0 };
        return {
          id: table.id,
          name: table.name,
          status: !cheque ? 'AVAILABLE' : cheque.status === 'READY_TO_CLOSE' ? 'ADVANCE_PRINTED' : 'OCCUPIED',
          chequeNumber: cheque?.sequenceNumber ?? null,
          ...calculation,
        };
      })),
    })));
  }
}
