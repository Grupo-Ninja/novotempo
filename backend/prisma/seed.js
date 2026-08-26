const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const readonlyPassword = await bcrypt.hash("leitura123", 10);

  await prisma.user.upsert({
    where: { email: "admin@novotempo.com" },
    update: {},
    create: {
      email: "admin@novotempo.com",
      name: "Administrador JP Agro",
      password: adminPassword,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "leitura@novotempo.com" },
    update: {},
    create: {
      email: "leitura@novotempo.com",
      name: "Leitura JP Agro",
      password: readonlyPassword,
      role: "readonly",
    },
  });

  console.log("✅ Seed concluído!");
  console.log("Admin: admin@novotempo.com / admin123");
  console.log("Leitura: leitura@novotempo.com / leitura123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
