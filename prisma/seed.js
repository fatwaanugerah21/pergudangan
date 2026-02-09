import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'fatwaanugerah0421@gmail.com' },
    update: {},
    create: {
      email: 'fatwaanugerah0421@gmail.com',
      password: await bcrypt.hash('12345678', 10),
      name: 'Fatwa Anugerah',
      role: 'admin',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      email: 'admin@gmail.com',
      password: await bcrypt.hash('admin', 10),
      name: 'Admin',
      role: 'admin',
    },
  });
  console.log('Created admin user:', admin.email);
  console.log('Created user user:', user.email);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
