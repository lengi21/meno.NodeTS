import 'dotenv/config';
import { AvailabilityStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demoMenu = [
  { name: 'ცხელი კერძები', dishes: [
    ['აჭარული ხაჭაპური', 'ყველითა და კვერცხით მომზადებული აჭარული ხაჭაპური.', 18, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80'],
    ['ქათმის ჩაშუშული', 'ნაზი ქათამი ტომატის სოუსით და მწვანილებით.', 22, 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd3?auto=format&fit=crop&w=600&q=80'],
    ['ქაბაბი', 'საქონლის ხორცის ქაბაბი ლავაშითა და ხახვით.', 16, 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=600&q=80'],
  ] },
  { name: 'სალათები', dishes: [
    ['ცეზარის სალათი', 'ქათმით, პარმეზანით და ცეზარის სოუსით.', 15, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=600&q=80'],
    ['ბერძნული სალათი', 'ახალი ბოსტნეული, ფეტა და ზეთისხილი.', 12, 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=600&q=80'],
  ] },
  { name: 'სუპები', dishes: [
    ['ჩიხირთმა', 'ტრადიციული ქართული ქათმის სუპი.', 11, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80'],
    ['სოკოს სუპი', 'კრემოვანი სოკოს სუპი.', 10, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80'],
  ] },
  { name: 'სასმელები', dishes: [
    ['ესპრესო', 'ახლად დაფქული ყავა.', 5, 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=600&q=80'],
    ['ლიმონათი', 'ცივი სახლის ლიმონათი.', 6, 'https://images.unsplash.com/photo-1523371054106-bbf80586c38c?auto=format&fit=crop&w=600&q=80'],
    ['ცივი ჩაი', 'არომატული ცივი ჩაი ლიმონით.', 5, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80'],
  ] },
  { name: 'დესერტები', dishes: [
    ['ტირამისუ', 'კლასიკური იტალიური დესერტი.', 13, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80'],
    ['ჩიზქეიქი', 'ნაზი ნაღების ჩიზქეიქი კენკრით.', 12, 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80'],
  ] },
  { name: 'ცომეული', dishes: [
    ['ლობიანი', 'ახალი ლობიანი ტრადიციული ცომით.', 10, 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd3?auto=format&fit=crop&w=600&q=80'],
    ['იმერული ხაჭაპური', 'იმერული ყველით გამომცხვარი ხაჭაპური.', 16, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80'],
    ['ფხალიანი ღვეზელი', 'მწვანილითა და ფხალით მომზადებული ღვეზელი.', 9, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'],
  ] },
  { name: 'გარნირი', dishes: [
    ['კარტოფილი ფრი', 'ხასხასა კარტოფილი ფრი.', 7, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80'],
    ['შემწვარი ბოსტნეული', 'სეზონური ბოსტნეული გრილზე.', 9, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'],
    ['ბრინჯი', 'არომატული ორთქლზე მომზადებული ბრინჯი.', 6, 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=600&q=80'],
  ] },
  { name: 'ცივი სასმელები', dishes: [
    ['კოკა-კოლა', 'ცივი გაზიანი სასმელი.', 4, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80'],
    ['წყალი', 'ნატურალური წყალი.', 2, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=80'],
    ['ფორთოხლის წვენი', 'ახლად მომზადებული ფორთოხლის წვენი.', 7, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80'],
  ] },
  { name: 'ალკოჰოლური სასმელები', dishes: [
    ['საფერავი', 'ქართული წითელი ღვინო ჭიქით.', 12, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80'],
    ['თეთრი ღვინო', 'ქართული მშრალი თეთრი ღვინო.', 11, 'https://images.unsplash.com/photo-1566754436893-9829c2f181e4?auto=format&fit=crop&w=600&q=80'],
    ['ლუდი', 'ცივი ჩამოსასხმელი ლუდი.', 8, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80'],
  ] },
] as const;

const translations: Record<string, { en: string; ru: string }> = {
  'ცხელი კერძები': { en: 'Main dishes', ru: 'Горячие блюда' }, 'სალათები': { en: 'Salads', ru: 'Салаты' }, 'სუპები': { en: 'Soups', ru: 'Супы' }, 'სასმელები': { en: 'Drinks', ru: 'Напитки' }, 'დესერტები': { en: 'Desserts', ru: 'Десерты' },
  'აჭარული ხაჭაპური': { en: 'Adjarian khachapuri', ru: 'Аджарский хачапури' }, 'ქათმის ჩაშუშული': { en: 'Chicken stew', ru: 'Тушёная курица' }, 'ქაბაბი': { en: 'Kebab', ru: 'Кебаб' }, 'ცეზარის სალათი': { en: 'Caesar salad', ru: 'Салат Цезарь' }, 'ბერძნული სალათი': { en: 'Greek salad', ru: 'Греческий салат' }, 'ჩიხირთმა': { en: 'Chikhirtma', ru: 'Чихиртма' }, 'სოკოს სუპი': { en: 'Mushroom soup', ru: 'Грибной суп' }, 'ესპრესო': { en: 'Espresso', ru: 'Эспрессо' }, 'ლიმონათი': { en: 'Lemonade', ru: 'Лимонад' }, 'ცივი ჩაი': { en: 'Iced tea', ru: 'Холодный чай' }, 'ტირამისუ': { en: 'Tiramisu', ru: 'Тирамису' }, 'ჩიზქეიქი': { en: 'Cheesecake', ru: 'Чизкейк' },
  'ცომეული': { en: 'Pastries', ru: 'Выпечка' }, 'გარნირი': { en: 'Sides', ru: 'Гарниры' }, 'ცივი სასმელები': { en: 'Cold drinks', ru: 'Холодные напитки' }, 'ალკოჰოლური სასმელები': { en: 'Alcoholic drinks', ru: 'Алкогольные напитки' },
  'ლობიანი': { en: 'Bean pie', ru: 'Лобиани' }, 'იმერული ხაჭაპური': { en: 'Imeretian khachapuri', ru: 'Имеретинский хачапури' }, 'ფხალიანი ღვეზელი': { en: 'Pkhali pie', ru: 'Пирог с пхали' },
  'კარტოფილი ფრი': { en: 'French fries', ru: 'Картофель фри' }, 'შემწვარი ბოსტნეული': { en: 'Grilled vegetables', ru: 'Овощи гриль' }, 'ბრინჯი': { en: 'Rice', ru: 'Рис' },
  'კოკა-კოლა': { en: 'Coca-Cola', ru: 'Кока-Кола' }, 'წყალი': { en: 'Water', ru: 'Вода' }, 'ფორთოხლის წვენი': { en: 'Orange juice', ru: 'Апельсиновый сок' },
  'საფერავი': { en: 'Saperavi', ru: 'Саперави' }, 'თეთრი ღვინო': { en: 'White wine', ru: 'Белое вино' }, 'ლუდი': { en: 'Beer', ru: 'Пиво' },
};

async function upsertCategory(restaurantId: string, name: string, sortOrder: number, dishes: readonly (readonly [string, string, number, string])[]) {
  let category = await prisma.category.findFirst({ where: { restaurantId, translations: { some: { languageCode: 'ka', name } } } });
  if (!category) category = await prisma.category.create({ data: { restaurantId, sortOrder, status: AvailabilityStatus.AVAILABLE } });
  await prisma.category.update({ where: { id: category.id }, data: { sortOrder, status: AvailabilityStatus.AVAILABLE } });
  await prisma.categoryTranslation.upsert({ where: { categoryId_languageCode: { categoryId: category.id, languageCode: 'ka' } }, update: { name }, create: { categoryId: category.id, languageCode: 'ka', name } });
  for (const languageCode of ['en', 'ru'] as const) {
    await prisma.categoryTranslation.upsert({ where: { categoryId_languageCode: { categoryId: category.id, languageCode } }, update: { name: translations[name][languageCode] }, create: { categoryId: category.id, languageCode, name: translations[name][languageCode] } });
  }
  for (const [dishName, description, priceAmount, imageUrl] of dishes) {
    const dishOrder = dishes.findIndex(([currentName]) => currentName === dishName);
    let dish = await prisma.dish.findFirst({ where: { restaurantId, categoryId: category.id, translations: { some: { languageCode: 'ka', name: dishName } } } });
    if (!dish) dish = await prisma.dish.create({ data: { restaurantId, categoryId: category.id, sortOrder: dishOrder, priceAmount, imageUrl, status: dishName === 'ცივი ჩაი' ? AvailabilityStatus.PAUSED : AvailabilityStatus.AVAILABLE } });
    await prisma.dish.update({ where: { id: dish.id }, data: { sortOrder: dishOrder, priceAmount, imageUrl, status: dishName === 'ცივი ჩაი' ? AvailabilityStatus.PAUSED : AvailabilityStatus.AVAILABLE } });
    await prisma.dishTranslation.upsert({ where: { dishId_languageCode: { dishId: dish.id, languageCode: 'ka' } }, update: { name: dishName, description }, create: { dishId: dish.id, languageCode: 'ka', name: dishName, description } });
    for (const languageCode of ['en', 'ru'] as const) {
      await prisma.dishTranslation.upsert({ where: { dishId_languageCode: { dishId: dish.id, languageCode } }, update: { name: translations[dishName][languageCode], description }, create: { dishId: dish.id, languageCode, name: translations[dishName][languageCode], description } });
    }
  }
}

async function upsertHall(restaurantId: string, name: string, sortOrder: number, tableCount: number) {
  const hall = await prisma.hall.upsert({ where: { restaurantId_name: { restaurantId, name } }, update: { sortOrder, isActive: true }, create: { restaurantId, name, sortOrder } });
  if (name === 'მთავარი დარბაზი') {
    const legacyHall = await prisma.hall.findFirst({ where: { restaurantId, name: 'Main Hall' } });
    if (legacyHall && legacyHall.id !== hall.id) {
      await prisma.diningTable.updateMany({ where: { hallId: legacyHall.id }, data: { hallId: hall.id } });
      await prisma.hall.delete({ where: { id: legacyHall.id } });
    }
  }
  for (let index = 1; index <= tableCount; index += 1) {
    await prisma.diningTable.upsert({ where: { hallId_name: { hallId: hall.id, name: `მაგიდა ${index}` } }, update: { sortOrder: index, isActive: true }, create: { hallId: hall.id, name: `მაგიდა ${index}`, sortOrder: index } });
  }
}

async function main() {
  const slug = process.env.SEED_RESTAURANT_SLUG ?? 'panda-house';
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) throw new Error(`Restaurant with slug "${slug}" does not exist. Run db:seed first.`);
  await upsertHall(restaurant.id, 'მთავარი დარბაზი', 0, 18);
  await upsertHall(restaurant.id, 'ტერასა', 1, 14);
  await upsertHall(restaurant.id, 'VIP დარბაზი', 2, 8);
  await upsertHall(restaurant.id, 'ბაღი', 3, 16);
  await upsertHall(restaurant.id, 'ლაუნჯი', 4, 12);
  for (const [index, category] of demoMenu.entries()) await upsertCategory(restaurant.id, category.name, index, category.dishes);
  await prisma.printer.upsert({ where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Demo Epson TM-T20III' } }, update: { connection: 'NETWORK', address: '192.168.1.88', paperWidthMm: 80, isActive: true }, create: { restaurantId: restaurant.id, name: 'Demo Epson TM-T20III', connection: 'NETWORK', address: '192.168.1.88', paperWidthMm: 80 } });
  console.log(`Demo halls and menu are ready for ${restaurant.slug}.`);
}

main().finally(() => prisma.$disconnect());
