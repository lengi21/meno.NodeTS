import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ChequeCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(chequeId: string, restaurantId: string) {
    const [cheque, settings] = await Promise.all([
      this.prisma.cheque.findFirstOrThrow({ where: { id: chequeId, restaurantId }, include: { items: true, discounts: true } }),
      this.prisma.restaurantPosSettings.findUnique({ where: { restaurantId } }),
    ]);
    const subtotal = cheque.items.filter((item) => item.status !== 'VOIDED').reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const serviceFeePercent = Number(settings?.serviceChargePercent ?? 0);
    const serviceFee = Number((subtotal * serviceFeePercent / 100).toFixed(2));
    const discount = cheque.discounts.reduce((sum, item) => sum + Number(item.amount), 0);
    return { subtotal, serviceFeePercent, serviceFee, discount, total: Math.max(0, Number((subtotal + serviceFee - discount).toFixed(2))) };
  }
}
