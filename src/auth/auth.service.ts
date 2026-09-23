import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthClaims } from './auth.types.js';
import type { RestaurantSignInDto } from './dto/restaurant-sign-in.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signInRestaurant(dto: RestaurantSignInDto) {
    const credential = await this.prisma.restaurantCredential.findFirst({
      where: { email: dto.email.trim().toLowerCase() },
      include: { restaurant: { include: { translations: { where: { languageCode: 'ka' }, take: 1 }, settings: { select: { defaultLanguage: true } } } } },
    });

    if (!credential || credential.restaurant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const validPassword = await bcrypt.compare(dto.password, credential.passwordHash);
    if (!validPassword) throw new UnauthorizedException('Email or password is incorrect');

    const device = await this.prisma.posDevice.upsert({
      where: {
        restaurantId_deviceFingerprint: {
          restaurantId: credential.restaurantId,
          deviceFingerprint: dto.deviceFingerprint,
        },
      },
      update: { displayName: dto.deviceName, lastSeenAt: new Date() },
      create: {
        restaurantId: credential.restaurantId,
        deviceFingerprint: dto.deviceFingerprint,
        displayName: dto.deviceName,
      },
    });

    const claims: AuthClaims = {
      sub: device.id,
      restaurantId: credential.restaurantId,
      deviceId: device.id,
      kind: 'restaurant-device',
    };

    return {
      accessToken: await this.jwt.signAsync(claims),
      restaurant: { id: credential.restaurant.id, slug: credential.restaurant.slug, name: credential.restaurant.translations[0]?.name ?? credential.restaurant.slug, defaultLanguage: credential.restaurant.settings?.defaultLanguage ?? 'ka' },
      device: { id: device.id, name: device.displayName },
    };
  }

  async signInPin(pin: string, claims: AuthClaims) {
    if (claims.kind !== 'restaurant-device') {
      throw new UnauthorizedException('A restaurant device session is required');
    }

    const device = await this.prisma.posDevice.findFirst({
      where: { id: claims.deviceId, restaurantId: claims.restaurantId },
    });
    if (!device) throw new UnauthorizedException('The device is no longer registered');

    const members = await this.prisma.staffMember.findMany({
      where: { restaurantId: claims.restaurantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const member = (await Promise.all(
      members.map(async (candidate) => ({
        candidate,
        matches: candidate.pinHash.startsWith('$argon2')
          ? await argon2.verify(candidate.pinHash, pin)
          : await bcrypt.compare(pin, candidate.pinHash),
      })),
    )).find((result) => result.matches)?.candidate;

    if (!member) {
      throw new UnauthorizedException('PIN is incorrect');
    }

    await this.prisma.posDevice.update({
      where: { id: claims.deviceId },
      data: { lastSeenAt: new Date() },
    });

    const userClaims: AuthClaims = {
      sub: member.id,
      restaurantId: claims.restaurantId,
      deviceId: claims.deviceId,
      memberId: member.id,
      kind: 'pos-user',
    };

    return {
      accessToken: await this.jwt.signAsync(userClaims),
      user: { id: member.id, firstName: member.firstName, lastName: member.lastName },
    };
  }
}
