import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DayBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async current(restaurantId: string) {
    const businessDate = new Date();
    businessDate.setHours(0, 0, 0, 0);
    const businessDay = await this.prisma.businessDay.findUnique({ where: { restaurantId_businessDate: { restaurantId, businessDate } } });
    if (!businessDay) return { businessDate, chequeCount: 0, totalPaid: 0, cash: 0, card: 0, transfer: 0, recentCheques: [] };
    const payments = await this.prisma.payment.findMany({
      where: { cheque: { businessDayId: businessDay.id, status: 'CLOSED' } },
      include: { cheque: { include: { table: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    const totals = payments.reduce((result, payment) => {
      const amount = Number(payment.amount);
      result.totalPaid += amount;
      if (payment.method === 'CASH') result.cash += amount;
      if (payment.method === 'CARD') result.card += amount;
      if (payment.method === 'TRANSFER') result.transfer += amount;
      return result;
    }, { totalPaid: 0, cash: 0, card: 0, transfer: 0 });
    const chequeCount = await this.prisma.cheque.count({ where: { businessDayId: businessDay.id, status: 'CLOSED' } });
    return { businessDate, chequeCount, ...totals, recentCheques: payments.map((payment) => ({ chequeNumber: payment.cheque.sequenceNumber, tableName: payment.cheque.table.name, amount: Number(payment.amount), method: payment.method, closedAt: payment.cheque.closedAt })) };
  }
}
