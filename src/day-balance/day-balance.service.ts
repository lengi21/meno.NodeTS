import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DayBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async current(restaurantId: string) {
    const businessDate = new Date();
    businessDate.setHours(0, 0, 0, 0);
    const businessDay = await this.prisma.businessDay.findUnique({ where: { restaurantId_businessDate: { restaurantId, businessDate } } });
    const settings = await this.prisma.restaurantPosSettings.findUnique({ where: { restaurantId } });
    if (!businessDay) return { businessDate, status: 'CLOSED', startsAt: settings?.businessDayStartsAt ?? '09:00', endsAt: settings?.businessDayEndsAt ?? '23:00', chequeCount: 0, totalPaid: 0, cash: 0, card: 0, transfer: 0, recentCheques: [] };
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
    return { businessDate, status: businessDay.status, startsAt: settings?.businessDayStartsAt ?? '09:00', endsAt: settings?.businessDayEndsAt ?? '23:00', chequeCount, ...totals, recentCheques: payments.map((payment) => ({ chequeNumber: payment.cheque.sequenceNumber, tableName: payment.cheque.table.name, amount: Number(payment.amount), method: payment.method, closedAt: payment.cheque.closedAt })) };
  }

  async close(restaurantId: string, memberId: string) {
    const businessDate = new Date(); businessDate.setHours(0, 0, 0, 0);
    const day = await this.prisma.businessDay.findUnique({ where: { restaurantId_businessDate: { restaurantId, businessDate } } });
    if (!day || day.status === 'CLOSED') throw new BadRequestException('Business day is already closed');
    const openCheques = await this.prisma.cheque.count({ where: { businessDayId: day.id, status: { in: ['OPEN', 'READY_TO_CLOSE'] } } });
    if (openCheques) throw new BadRequestException('Close or cancel all active cheques first');
    const owner = await this.prisma.staffMember.findUnique({ where: { id: memberId }, include: { roles: { include: { role: true } } } });
    if (!owner?.roles.some(({ role }) => role.isOwnerRole)) throw new ForbiddenException('Owner permission is required');
    await this.prisma.$transaction([this.prisma.businessDay.update({ where: { id: day.id }, data: { status: 'CLOSED', closedAt: new Date() } }), this.prisma.auditEvent.create({ data: { restaurantId, memberId, action: 'BUSINESS_DAY_CLOSED', entityType: 'BusinessDay', entityId: day.id } })]);
    return this.current(restaurantId);
  }
}
