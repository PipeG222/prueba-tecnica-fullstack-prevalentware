// prisma/seed.ts
import 'dotenv/config';               // ✅ carga .env
import 'tsconfig-paths/register';     // ✅ resuelve "@/..." fuera de Next
import { prisma } from '@/lib/prisma';

if (!process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL. Asegúrate de tener .env con el puerto 6543 (pooling).');
  process.exit(1);
}

const EMAIL = 'felipegove2004@gmail.com';
const YEAR = new Date().getFullYear();

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function randomDateInMonth(year: number, month: number) {
  const day = rand(1, new Date(year, month + 1, 0).getDate());
  return new Date(year, month, day, rand(8, 20), rand(0, 59));
}

async function main() {
  console.log('⏳ Seed iniciando…', { year: YEAR });

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      id: crypto.randomUUID(),
      email: EMAIL,
      name: 'Admin Demo',
      emailVerified: true,
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log('👤 Usuario:', user.email);

  // Limpia movimientos del año para no duplicar
  await prisma.movement.deleteMany({
    where: {
      userId: user.id,
      date: { gte: new Date(YEAR, 0, 1), lt: new Date(YEAR + 1, 0, 1) },
    },
  });

  // Generar datos de 12 meses
  const movimientos: any[] = [];
  for (let m = 0; m < 12; m++) {
    const ingresos = rand(15, 30);
    const egresos = rand(10, 25);

    for (let i = 0; i < ingresos; i++) {
      const d = randomDateInMonth(YEAR, m);
      movimientos.push({
        id: crypto.randomUUID(),
        type: 'INCOME',
        concept: `Venta ${m + 1}-${i + 1}`,
        amount: rand(50_000, 900_000),
        date: d,
        userId: user.id,
        createdAt: d,
        updatedAt: d,
      });
    }

    for (let i = 0; i < egresos; i++) {
      const d = randomDateInMonth(YEAR, m);
      movimientos.push({
        id: crypto.randomUUID(),
        type: 'EXPENSE',
        concept: `Gasto ${m + 1}-${i + 1}`,
        amount: rand(20_000, 600_000),
        date: d,
        userId: user.id,
        createdAt: d,
        updatedAt: d,
      });
    }
  }

  const inserted = await prisma.movement.createMany({
    data: movimientos,
    skipDuplicates: true,
  });
  console.log('💾 Movimientos insertados:', inserted.count);

  const totals = {
    users: await prisma.user.count(),
    movements: await prisma.movement.count(),
  };
  console.log('✅ Totales:', totals);
}

main()
  .then(() => console.log('🎉 Seed completado.'))
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
