import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when running db:seed`);
  return value;
};

const randomPin = (): string => String(Math.floor(1000 + Math.random() * 9000));

const permissionDefinitions = [
  ['cheque.open', 'Open a cheque'],
  ['cheque.edit', 'Edit cheque items'],
  ['cheque.modify-ordered', 'Modify an already ordered cheque item'],
  ['cheque.cancel', 'Cancel a cheque containing ordered items'],
  ['cheque.order', 'Send an order'],
  ['cheque.discount', 'Apply a discount'],
  ['cheque.advance-print', 'Print an advance cheque'],
  ['cheque.close', 'Close a cheque'],
  ['cheque.reopen', 'Reopen a closed cheque'],
  ['cheque.reprint', 'Reprint a cheque'],
  ['day.view-balance', 'View day balance'],
  ['day.close', 'Close a business day'],
  ['printer.manage', 'Manage printers'],
  ['staff.manage', 'Manage staff'],
  ['menu.pause', 'Pause menu content'],
] as const;

const main = async (): Promise<void> => {
  const restaurantSlug = required('SEED_RESTAURANT_SLUG').toLowerCase();
  const restaurantName = required('SEED_RESTAURANT_NAME');
  const email = required('SEED_RESTAURANT_EMAIL').toLowerCase();
  const password = required('SEED_RESTAURANT_PASSWORD');
  const firstName = process.env.SEED_OWNER_FIRST_NAME?.trim() || 'Owner';
  const lastName = process.env.SEED_OWNER_LAST_NAME?.trim() || 'User';
  const pin = randomPin();

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: restaurantSlug },
    update: { status: 'ACTIVE' },
    create: { slug: restaurantSlug },
  });

  await prisma.restaurantTranslation.upsert({
    where: { restaurantId_languageCode: { restaurantId: restaurant.id, languageCode: 'ka' } },
    update: { name: restaurantName },
    create: { restaurantId: restaurant.id, languageCode: 'ka', name: restaurantName },
  });

  await prisma.restaurantCredential.upsert({
    where: { restaurantId: restaurant.id },
    update: { email, passwordHash: await bcrypt.hash(password, 12) },
    create: { restaurantId: restaurant.id, email, passwordHash: await bcrypt.hash(password, 12) },
  });

  await prisma.restaurantPosSettings.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: { restaurantId: restaurant.id },
  });

  const hall = await prisma.hall.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Main Hall' } },
    update: { isActive: true },
    create: { restaurantId: restaurant.id, name: 'Main Hall', sortOrder: 1 },
  });
  await prisma.diningTable.upsert({
    where: { hallId_name: { hallId: hall.id, name: 'Table 1' } },
    update: { isActive: true },
    create: { hallId: hall.id, name: 'Table 1', sortOrder: 1 },
  });

  const permissions = await Promise.all(
    permissionDefinitions.map(([code, description]) =>
      prisma.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description },
      }),
    ),
  );

  const ownerRole = await prisma.role.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Owner' } },
    update: { isOwnerRole: true },
    create: { restaurantId: restaurant.id, name: 'Owner', isOwnerRole: true },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: ownerRole.id, permissionId: permission.id })),
    skipDuplicates: true,
  });

  const existingOwner = await prisma.staffMember.findFirst({
    where: { restaurantId: restaurant.id, firstName, lastName },
  });
  const owner = existingOwner
    ? await prisma.staffMember.update({
        where: { id: existingOwner.id },
        data: { pinHash: await bcrypt.hash(pin, 12), isActive: true },
      })
    : await prisma.staffMember.create({
        data: {
          restaurantId: restaurant.id,
          firstName,
          lastName,
          pinHash: await bcrypt.hash(pin, 12),
        },
      });

  await prisma.memberRole.upsert({
    where: { memberId_roleId: { memberId: owner.id, roleId: ownerRole.id } },
    update: {},
    create: { memberId: owner.id, roleId: ownerRole.id },
  });
  console.log(`Restaurant ready: ${restaurantSlug}`);
  console.log(`Owner PIN (deliver securely to the owner): ${pin}`);
};

main().finally(async () => prisma.$disconnect());
