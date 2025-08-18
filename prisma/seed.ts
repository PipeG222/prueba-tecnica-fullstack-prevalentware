import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Seed: empezando...");

  const email = "felipegove2004@gmail.com";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: crypto.randomUUID(),
      email,
      name: "Admin Demo",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: "ADMIN",
    },
  });
  console.log("👤 Usuario upsert:", user.id, user.email);

  const { count } = await prisma.movement.createMany({
    data: [
      { id: crypto.randomUUID(), type: "INCOME",  concept: "Venta #1001", amount: 120000, date: new Date(), userId: user.id, createdAt: new Date(), updatedAt: new Date() },
      { id: crypto.randomUUID(), type: "EXPENSE", concept: "Servicios",   amount:  45000, date: new Date(), userId: user.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    skipDuplicates: true,
  });
  console.log("💾 Movimientos insertados:", count);

  const totals = {
    users: await prisma.user.count(),
    movements: await prisma.movement.count(),
  };
  console.log("✅ Totales:", totals);
}

main()
  .then(() => {
    console.log("🎉 Seed completado.");
  })
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
