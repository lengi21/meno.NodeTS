import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LanguageCode, PrintJobType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AddItemDto } from './dto/add-item.dto.js';
import type { CloseChequeDto } from './dto/close-cheque.dto.js';
import type { SetDiscountDto } from './dto/set-discount.dto.js';
import { ChequeCalculationService } from './cheque-calculation.service.js';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService, private readonly calculations: ChequeCalculationService) {}

  async openOrGet(tableId: string, restaurantId: string, memberId: string, language: LanguageCode, guestCount = 1) {
    const table = await this.prisma.diningTable.findFirst({
      where: { id: tableId, isActive: true, hall: { restaurantId, isActive: true } },
      include: { hall: true },
    });
    if (!table) throw new NotFoundException('Table not found');

    let cheque = await this.prisma.cheque.findFirst({
      where: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } },
      orderBy: { openedAt: 'desc' },
    });

    if (!cheque) {
      const businessDate = new Date();
      businessDate.setHours(0, 0, 0, 0);
      const businessDay = await this.prisma.businessDay.upsert({
        where: { restaurantId_businessDate: { restaurantId, businessDate } },
        update: { status: 'OPEN' },
        create: { restaurantId, businessDate, status: 'OPEN' },
      });
      const lastCheque = await this.prisma.cheque.findFirst({ where: { restaurantId }, orderBy: { sequenceNumber: 'desc' } });
      cheque = await this.prisma.cheque.create({
        data: {
          restaurantId,
          tableId,
          businessDayId: businessDay.id,
          openedByMemberId: memberId,
          sequenceNumber: (lastCheque?.sequenceNumber ?? 0) + 1,
          guestCount,
        },
      });
    }

    return this.view(cheque.id, restaurantId, table, language);
  }

  async addItem(tableId: string, restaurantId: string, dto: AddItemDto, memberId: string, language: LanguageCode) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, isActive: true, hall: { restaurantId } }, include: { hall: true } });
    if (!table) throw new NotFoundException('Table not found');
    const cheque = await this.prisma.cheque.findFirst({ where: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } }, orderBy: { openedAt: 'desc' } });
    if (!cheque) return this.openOrGet(tableId, restaurantId, memberId, language);
    const dish = await this.prisma.dish.findFirst({ where: { id: dto.dishId, restaurantId, status: { not: 'HIDDEN' }, category: { restaurantId, status: { not: 'HIDDEN' } } }, include: { translations: { where: { languageCode: language }, take: 1 } } });
    if (!dish) throw new NotFoundException('Dish not found');
    const existing = await this.prisma.chequeItem.findFirst({ where: { chequeId: cheque.id, dishId: dish.id, status: 'UNORDERED' } });
    if (existing) await this.prisma.chequeItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + dto.quantity } });
    else await this.prisma.chequeItem.create({ data: { chequeId: cheque.id, dishId: dish.id, quantity: dto.quantity, unitPrice: dish.priceAmount, dishName: dish.translations[0]?.name ?? dish.id } });
    await this.markChequeChanged(cheque.id);
    return this.view(cheque.id, restaurantId, table, language);
  }

  async updateUnorderedItem(tableId: string, itemId: string, restaurantId: string, quantity: number, language: LanguageCode) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, isActive: true, hall: { restaurantId } }, include: { hall: true } });
    if (!table) throw new NotFoundException('Table not found');
    const item = await this.prisma.chequeItem.findFirst({
      where: { id: itemId, cheque: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } }, status: 'UNORDERED' },
      select: { id: true, chequeId: true },
    });
    if (!item) throw new NotFoundException('Unordered cheque item not found');
    if (quantity === 0) await this.prisma.chequeItem.delete({ where: { id: item.id } });
    else await this.prisma.chequeItem.update({ where: { id: item.id }, data: { quantity } });
    await this.markChequeChanged(item.chequeId);
    return this.view(item.chequeId, restaurantId, table, language);
  }

  async updateGuestCount(tableId: string, restaurantId: string, guestCount: number, language: LanguageCode) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, isActive: true, hall: { restaurantId } }, include: { hall: true } });
    if (!table) throw new NotFoundException('Table not found');
    const cheque = await this.prisma.cheque.findFirst({ where: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } }, orderBy: { openedAt: 'desc' } });
    if (!cheque) throw new NotFoundException('Active cheque not found');
    await this.prisma.cheque.update({ where: { id: cheque.id }, data: { guestCount } });
    return this.view(cheque.id, restaurantId, table, language);
  }

  async setDiscount(tableId: string, restaurantId: string, memberId: string, dto: SetDiscountDto, language: LanguageCode) {
    await this.assertPermission(memberId, 'cheque.discount');
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, isActive: true, hall: { restaurantId } }, include: { hall: true } });
    if (!table) throw new NotFoundException('Table not found');
    const cheque = await this.prisma.cheque.findFirst({ where: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } }, orderBy: { openedAt: 'desc' } });
    if (!cheque) throw new NotFoundException('Active cheque not found');
    const base = await this.calculations.calculate(cheque.id, restaurantId);
    const amount = dto.type === 'PERCENTAGE' ? Number((base.subtotal * dto.value / 100).toFixed(2)) : Math.min(dto.value, base.subtotal + base.serviceFee);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.discount.deleteMany({ where: { chequeId: cheque.id } });
      if (amount > 0) await transaction.discount.create({ data: { chequeId: cheque.id, type: dto.type, value: dto.value, amount, reason: dto.reason?.trim() || 'Table discount' } });
      await transaction.cheque.update({ where: { id: cheque.id }, data: { version: { increment: 1 }, status: 'OPEN' } });
      await transaction.auditEvent.create({ data: { restaurantId, memberId, action: 'CHEQUE_DISCOUNT_UPDATED', entityType: 'Cheque', entityId: cheque.id, metadata: { type: dto.type, value: dto.value, amount } } });
    });
    return this.view(cheque.id, restaurantId, table, language);
  }

  async modifyOrderedItem(tableId: string, itemId: string, restaurantId: string, memberId: string, quantity: number, language: LanguageCode) {
    await this.assertPermission(memberId, 'cheque.modify-ordered');
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, isActive: true, hall: { restaurantId } }, include: { hall: true } });
    if (!table) throw new NotFoundException('Table not found');
    const item = await this.prisma.chequeItem.findFirst({ where: { id: itemId, cheque: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } }, status: { in: ['ORDERED', 'MODIFIED'] } }, include: { cheque: true, order: true, dish: { include: { translations: { where: { languageCode: language }, take: 1 } } } } });
    if (!item) throw new NotFoundException('Ordered cheque item not found');
    const previousQuantity = item.quantity;
    const orderId = item.order ? this.orderId(item.cheque.sequenceNumber, item.order.sequenceInCheque) : null;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.chequeItem.update({ where: { id: item.id }, data: { quantity, status: quantity === 0 ? 'VOIDED' : 'MODIFIED' } });
      await transaction.cheque.update({ where: { id: item.chequeId }, data: { version: { increment: 1 }, status: 'OPEN' } });
      await this.queuePrintJobs(transaction, restaurantId, 'MODIFICATION', { chequeId: item.chequeId, orderId: item.orderId, payload: { chequeNumber: item.cheque.sequenceNumber, orderId, orderDate: item.order?.createdAt ?? null, modifiedAt: new Date(), language, changes: [{ dish: item.dish.translations[0]?.name ?? item.dishName, previousQuantity, quantity, removed: quantity === 0 }] } });
      await transaction.auditEvent.create({ data: { restaurantId, memberId, action: 'ORDERED_ITEM_MODIFIED', entityType: 'ChequeItem', entityId: item.id, metadata: { chequeId: item.chequeId, orderId, previousQuantity, quantity } } });
    });
    return this.view(item.chequeId, restaurantId, table, language);
  }

  async cancelCheque(tableId: string, restaurantId: string, memberId: string, language: LanguageCode) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, isActive: true, hall: { restaurantId } }, include: { hall: true } });
    if (!table) throw new NotFoundException('Table not found');
    const cheque = await this.prisma.cheque.findFirst({ where: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } }, orderBy: { openedAt: 'desc' }, include: { items: { where: { status: { not: 'VOIDED' } }, include: { order: true, dish: { include: { translations: { where: { languageCode: language }, take: 1 } } } } } } });
    if (!cheque) throw new NotFoundException('Active cheque not found');
    const orderedItems = cheque.items.filter((item) => item.status === 'ORDERED' || item.status === 'MODIFIED');
    if (orderedItems.length) await this.assertPermission(memberId, 'cheque.cancel');
    await this.prisma.$transaction(async (transaction) => {
      await transaction.chequeItem.updateMany({ where: { id: { in: cheque.items.map((item) => item.id) } }, data: { status: 'VOIDED' } });
      await transaction.cheque.update({ where: { id: cheque.id }, data: { status: 'VOIDED' } });
      if (orderedItems.length) {
        await this.queuePrintJobs(transaction, restaurantId, 'MODIFICATION', { chequeId: cheque.id, payload: { chequeNumber: cheque.sequenceNumber, language, cancelledAt: new Date(), changes: orderedItems.map((item) => ({ dish: item.dish.translations[0]?.name ?? item.dishName, orderId: item.order ? this.orderId(cheque.sequenceNumber, item.order.sequenceInCheque) : null, orderDate: item.order?.createdAt ?? null, previousQuantity: item.quantity, quantity: 0, removed: true })) } });
      }
      await transaction.auditEvent.create({ data: { restaurantId, memberId, action: 'CHEQUE_CANCELLED', entityType: 'Cheque', entityId: cheque.id, metadata: { chequeNumber: cheque.sequenceNumber, orderedItemCount: orderedItems.length } } });
    });
    return { cancelled: true, chequeNumber: cheque.sequenceNumber, modificationQueued: orderedItems.length > 0 };
  }

  async sendOrder(tableId: string, restaurantId: string, memberId: string, language: LanguageCode) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, isActive: true, hall: { restaurantId } }, include: { hall: true } });
    if (!table) throw new NotFoundException('Table not found');
    const cheque = await this.prisma.cheque.findFirst({ where: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } }, orderBy: { openedAt: 'desc' } });
    if (!cheque) throw new NotFoundException('Active cheque not found');
    const unorderedItems = await this.prisma.chequeItem.findMany({ where: { chequeId: cheque.id, status: 'UNORDERED' }, orderBy: { createdAt: 'desc' }, include: { dish: { include: { translations: { where: { languageCode: language }, take: 1 } } } } });
    if (!unorderedItems.length) throw new BadRequestException('There are no unordered items');

    let createdOrderNumber = 0;
    let createdOrderId = '';
    await this.prisma.$transaction(async (transaction) => {
      const lastOrder = await transaction.order.findFirst({ where: { restaurantId }, orderBy: { sequenceNumber: 'desc' }, select: { sequenceNumber: true } });
      const orderCount = await transaction.order.count({ where: { chequeId: cheque.id } });
      const order = await transaction.order.create({
        data: { restaurantId, chequeId: cheque.id, createdByMemberId: memberId, sequenceNumber: (lastOrder?.sequenceNumber ?? 0) + 1, sequenceInCheque: orderCount + 1 },
      });
      createdOrderNumber = order.sequenceNumber;
      createdOrderId = this.orderId(cheque.sequenceNumber, order.sequenceInCheque);
      await transaction.chequeItem.updateMany({ where: { id: { in: unorderedItems.map((item) => item.id) } }, data: { orderId: order.id, status: 'ORDERED' } });
      await this.queuePrintJobs(transaction, restaurantId, 'ORDER', { chequeId: cheque.id, orderId: order.id, payload: { chequeId: cheque.id, chequeNumber: cheque.sequenceNumber, orderNumber: order.sequenceNumber, orderId: createdOrderId, language, items: unorderedItems.map((item) => ({ name: item.dish.translations[0]?.name ?? item.dishName, quantity: item.quantity, unitPrice: Number(item.unitPrice) })) } });
      await transaction.auditEvent.create({ data: { restaurantId, memberId, action: 'ORDER_CREATED', entityType: 'Order', entityId: order.id, metadata: { chequeId: cheque.id, chequeNumber: cheque.sequenceNumber, orderId: createdOrderId, itemCount: unorderedItems.length } } });
    });
    return { ...(await this.view(cheque.id, restaurantId, table, language)), lastQueuedOrderNumber: createdOrderNumber, lastQueuedOrderId: createdOrderId };
  }

  async printAdvanceCheque(tableId: string, restaurantId: string, memberId: string, language: LanguageCode) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, isActive: true, hall: { restaurantId } }, include: { hall: true } });
    if (!table) throw new NotFoundException('Table not found');
    const cheque = await this.prisma.cheque.findFirst({
      where: { tableId, restaurantId, status: { in: ['OPEN', 'READY_TO_CLOSE'] } },
      include: { items: { orderBy: { createdAt: 'desc' }, include: { dish: { include: { translations: { where: { languageCode: language }, take: 1 } } } } } },
      orderBy: { openedAt: 'desc' },
    });
    if (!cheque) throw new NotFoundException('Active cheque not found');
    if (!cheque.items.length || cheque.items.some((item) => item.status === 'UNORDERED')) {
      throw new BadRequestException('All cheque items must be ordered before printing an advance cheque');
    }
    const calculation = await this.calculations.calculate(cheque.id, restaurantId);
    const total = calculation.total;
    const lastOrder = await this.prisma.order.findFirst({ where: { chequeId: cheque.id }, orderBy: { sequenceInCheque: 'desc' }, select: { sequenceInCheque: true } });
    const lastOrderId = lastOrder ? this.orderId(cheque.sequenceNumber, lastOrder.sequenceInCheque) : null;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.cheque.update({
        where: { id: cheque.id },
        data: { status: 'READY_TO_CLOSE', advancePrintedAt: new Date(), advanceVersion: cheque.version },
      });
      await this.queuePrintJobs(transaction, restaurantId, 'ADVANCE_CHEQUE', {
        chequeId: cheque.id,
        payload: {
            chequeNumber: cheque.sequenceNumber,
            chequeVersion: cheque.version,
            lastOrderId,
            tableName: table.name,
            language,
            items: cheque.items.map((item) => ({ name: item.dish.translations[0]?.name ?? item.dishName, quantity: item.quantity, unitPrice: Number(item.unitPrice) })),
            total,
        },
      });
      await transaction.auditEvent.create({ data: { restaurantId, memberId, action: 'ADVANCE_CHEQUE_QUEUED', entityType: 'Cheque', entityId: cheque.id, metadata: { version: cheque.version, total, lastOrderId } } });
    });
    return { ...(await this.view(cheque.id, restaurantId, table, language)), advanceChequeQueued: true };
  }

  async closeCheque(tableId: string, restaurantId: string, memberId: string, dto: CloseChequeDto) {
    const cheque = await this.prisma.cheque.findFirst({
      where: { tableId, restaurantId, status: 'READY_TO_CLOSE' },
      include: { items: { orderBy: { createdAt: 'desc' }, include: { dish: { include: { translations: { where: { languageCode: dto.receiptLanguage }, take: 1 } } } } } },
      orderBy: { openedAt: 'desc' },
    });
    if (!cheque) throw new NotFoundException('Cheque ready to close was not found');
    if (cheque.advanceVersion !== cheque.version || cheque.items.some((item) => item.status === 'UNORDERED')) {
      throw new BadRequestException('A current advance cheque is required before closing');
    }
    const calculation = await this.calculations.calculate(cheque.id, restaurantId);
    const total = calculation.total;
    const receivedAmount = dto.method === 'CASH' ? dto.receivedAmount ?? 0 : total;
    if (dto.method === 'CASH' && receivedAmount < total) throw new BadRequestException('Cash received must cover the cheque total');
    if ((dto.method === 'CARD' || dto.method === 'TRANSFER') && !dto.bankName) throw new BadRequestException('A bank must be selected');
    if (dto.method === 'TRANSFER' && !dto.iban) throw new BadRequestException('An IBAN is required for transfers');
    const changeAmount = dto.method === 'CASH' ? receivedAmount - total : 0;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.payment.create({
        data: { chequeId: cheque.id, method: dto.method, amount: total, receivedAmount: dto.method === 'CASH' ? receivedAmount : null, changeAmount, bankName: dto.bankName, iban: dto.iban },
      });
      await transaction.cheque.update({ where: { id: cheque.id }, data: { status: 'CLOSED', closedByMemberId: memberId, closedAt: new Date() } });
      if (dto.printReceipt) {
        await this.queuePrintJobs(transaction, restaurantId, 'CLOSE_CHEQUE', {
          chequeId: cheque.id,
          payload: {
              chequeNumber: cheque.sequenceNumber,
              tableId,
              paymentMethod: dto.method,
              bankName: dto.bankName ?? null,
              language: dto.receiptLanguage,
              total,
              receivedAmount,
              changeAmount,
              items: cheque.items.map((item) => ({ name: item.dish.translations[0]?.name ?? item.dishName, quantity: item.quantity, unitPrice: Number(item.unitPrice) })),
          },
        });
      }
      await transaction.auditEvent.create({ data: { restaurantId, memberId, action: 'CHEQUE_CLOSED', entityType: 'Cheque', entityId: cheque.id, metadata: { paymentMethod: dto.method, total, printReceipt: dto.printReceipt } } });
    });
    return { chequeNumber: cheque.sequenceNumber, total, receivedAmount, changeAmount, printQueued: dto.printReceipt };
  }

  private markChequeChanged(chequeId: string) {
    return this.prisma.cheque.update({ where: { id: chequeId }, data: { version: { increment: 1 }, status: 'OPEN' } });
  }

  private async view(chequeId: string, restaurantId: string, table: { id: string; name: string; hall: { id: string; name: string } }, language: LanguageCode) {
    const [cheque, categories] = await Promise.all([
      this.prisma.cheque.findFirstOrThrow({ where: { id: chequeId, restaurantId }, include: { items: { orderBy: { createdAt: 'desc' }, include: { order: { select: { sequenceNumber: true, sequenceInCheque: true, createdAt: true } }, dish: { include: { translations: { where: { languageCode: language }, take: 1 } } } } } } }),
      this.prisma.category.findMany({
        where: { restaurantId, status: { not: 'HIDDEN' } },
        orderBy: { sortOrder: 'asc' },
        include: { translations: { where: { languageCode: language }, take: 1 }, dishes: { where: { status: { not: 'HIDDEN' } }, orderBy: { sortOrder: 'asc' }, include: { translations: { where: { languageCode: language }, take: 1 } } } },
      }),
    ]);
    const items = cheque.items.map((item) => ({ id: item.id, dishId: item.dishId, name: item.dish.translations[0]?.name ?? item.dishName, quantity: item.quantity, unitPrice: Number(item.unitPrice), status: item.status, orderNumber: item.order?.sequenceNumber ?? null, orderId: item.order ? this.orderId(cheque.sequenceNumber, item.order.sequenceInCheque) : null, orderCreatedAt: item.order?.createdAt.toISOString() ?? null }));
    const hasUnorderedItems = items.some((item) => item.status === 'UNORDERED');
    const calculation = await this.calculations.calculate(cheque.id, restaurantId);
    const total = calculation.total;
    const advanceMatchesCurrentVersion = cheque.advanceVersion === cheque.version;
    return {
      table: { id: table.id, name: table.name, hallName: table.hall.name, guestCount: cheque.guestCount },
      cheque: {
        id: cheque.id,
        number: cheque.sequenceNumber,
        status: cheque.status,
        items,
        total,
        subtotal: calculation.subtotal,
        serviceFee: calculation.serviceFee,
        serviceFeePercent: calculation.serviceFeePercent,
        discount: calculation.discount,
        canPrintAdvance: items.length > 0 && !hasUnorderedItems,
        canClose: items.length > 0 && !hasUnorderedItems && cheque.status === 'READY_TO_CLOSE' && advanceMatchesCurrentVersion,
      },
      categories: categories.map((category) => ({ id: category.id, name: category.translations[0]?.name ?? category.id, status: category.status, dishes: category.dishes.map((dish) => ({ id: dish.id, name: dish.translations[0]?.name ?? dish.id, description: dish.translations[0]?.description ?? '', price: Number(dish.priceAmount), status: dish.status, imageUrl: dish.imageUrl })) })),
    };
  }

  private orderId(chequeNumber: number, sequenceInCheque: number): string {
    return `${chequeNumber.toString().padStart(6, '0')}-${sequenceInCheque.toString().padStart(2, '0')}`;
  }

  /** A receipt type can be routed to several active printers for one restaurant. */
  private async queuePrintJobs(transaction: Prisma.TransactionClient, restaurantId: string, type: PrintJobType, data: { chequeId?: string; orderId?: string | null; payload: Prisma.InputJsonValue | Record<string, unknown> }) {
    const routes = await transaction.printerRoute.findMany({ where: { jobType: type, printer: { restaurantId, isActive: true } }, select: { printerId: true } });
    const printerIds = routes.length ? routes.map((route) => route.printerId) : [null];
    await transaction.printJob.createMany({ data: printerIds.map((printerId) => ({ chequeId: data.chequeId, orderId: data.orderId ?? null, printerId, type, payload: data.payload as Prisma.InputJsonValue })) });
  }

  private async assertPermission(memberId: string, code: string): Promise<void> {
    const member = await this.prisma.staffMember.findUnique({ where: { id: memberId }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }, permissions: { include: { permission: true } } } });
    const owner = member?.roles.some(({ role }) => role.isOwnerRole);
    const roleGranted = member?.roles.some(({ role }) => role.permissions.some(({ permission }) => permission.code === code));
    const direct = member?.permissions.find(({ permission }) => permission.code === code);
    if (!member || (!owner && direct?.isGranted !== true && !roleGranted)) throw new ForbiddenException('Permission is required for this action');
  }
}
