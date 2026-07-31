import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      {
        email: 'admin@example.com',
        name: 'Admin',
      },
      {
        email: 'member@example.com',
        name: 'Member',
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });