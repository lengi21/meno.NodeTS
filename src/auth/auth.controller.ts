import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { PinSignInDto } from './dto/pin-sign-in.dto.js';
import { RestaurantSignInDto } from './dto/restaurant-sign-in.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('restaurant/sign-in')
  signInRestaurant(@Body() dto: RestaurantSignInDto) {
    return this.auth.signInRestaurant(dto);
  }

  @Post('pin')
  @UseGuards(AccessTokenGuard)
  signInPin(@Body() dto: PinSignInDto, @Req() request: Request & AuthenticatedRequest) {
    return this.auth.signInPin(dto.pin, request.auth!);
  }
}
