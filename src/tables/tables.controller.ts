import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { LanguageCode } from '@prisma/client';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { AddItemDto } from './dto/add-item.dto.js';
import { CloseChequeDto } from './dto/close-cheque.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { OpenChequeDto } from './dto/open-cheque.dto.js';
import { ModifyOrderedItemDto } from './dto/modify-ordered-item.dto.js';
import { UpdateGuestCountDto } from './dto/update-guest-count.dto.js';
import { SetDiscountDto } from './dto/set-discount.dto.js';
import { TablesService } from './tables.service.js';

@Controller('tables')
@UseGuards(AccessTokenGuard)
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get(':tableId/active')
  active(@Param('tableId') tableId: string, @Query('language') language: string | undefined, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.openOrGet(tableId, auth.restaurantId, auth.memberId!, this.language(language));
  }

  @Post(':tableId/active/open')
  open(@Param('tableId') tableId: string, @Query('language') language: string | undefined, @Body() dto: OpenChequeDto, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.openOrGet(tableId, auth.restaurantId, auth.memberId!, this.language(language), dto.guestCount);
  }

  @Post(':tableId/active/items')
  addItem(@Param('tableId') tableId: string, @Query('language') language: string | undefined, @Body() dto: AddItemDto, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.addItem(tableId, auth.restaurantId, dto, auth.memberId!, this.language(language));
  }

  @Patch(':tableId/active/items/:itemId')
  updateItem(@Param('tableId') tableId: string, @Param('itemId') itemId: string, @Query('language') language: string | undefined, @Body() dto: UpdateItemDto, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.updateUnorderedItem(tableId, itemId, auth.restaurantId, dto.quantity, this.language(language));
  }

  @Patch(':tableId/active/guests')
  updateGuests(@Param('tableId') tableId: string, @Query('language') language: string | undefined, @Body() dto: UpdateGuestCountDto, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.updateGuestCount(tableId, auth.restaurantId, dto.guestCount, this.language(language));
  }

  @Patch(':tableId/active/discount')
  discount(@Param('tableId') tableId: string, @Query('language') language: string | undefined, @Body() dto: SetDiscountDto, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.setDiscount(tableId, auth.restaurantId, auth.memberId!, dto, this.language(language));
  }

  @Patch(':tableId/active/items/:itemId/ordered')
  modifyOrderedItem(@Param('tableId') tableId: string, @Param('itemId') itemId: string, @Query('language') language: string | undefined, @Body() dto: ModifyOrderedItemDto, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.modifyOrderedItem(tableId, itemId, auth.restaurantId, auth.memberId!, dto.quantity, this.language(language));
  }

  @Post(':tableId/active/cancel')
  cancel(@Param('tableId') tableId: string, @Query('language') language: string | undefined, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.cancelCheque(tableId, auth.restaurantId, auth.memberId!, this.language(language));
  }

  @Post(':tableId/active/orders')
  sendOrder(@Param('tableId') tableId: string, @Query('language') language: string | undefined, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.sendOrder(tableId, auth.restaurantId, auth.memberId!, this.language(language));
  }

  @Post(':tableId/active/advance-cheque')
  printAdvanceCheque(@Param('tableId') tableId: string, @Query('language') language: string | undefined, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.printAdvanceCheque(tableId, auth.restaurantId, auth.memberId!, this.language(language));
  }

  @Post(':tableId/active/close')
  closeCheque(@Param('tableId') tableId: string, @Body() dto: CloseChequeDto, @Req() request: Request & AuthenticatedRequest) {
    const auth = this.user(request);
    return this.tables.closeCheque(tableId, auth.restaurantId, auth.memberId!, dto);
  }

  private user(request: Request & AuthenticatedRequest) {
    const auth = request.auth;
    if (!auth || auth.kind !== 'pos-user' || !auth.memberId) throw new ForbiddenException('A staff PIN session is required');
    return auth;
  }

  private language(language: string | undefined): LanguageCode {
    return language === LanguageCode.en || language === LanguageCode.ru ? language : LanguageCode.ka;
  }
}
