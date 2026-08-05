import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

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