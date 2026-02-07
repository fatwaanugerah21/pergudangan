import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@warehouse.com' },
    update: {},
    create: {
      email: 'admin@warehouse.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create rice types
  const riceTypes = [
    {
      name: 'Premium Rice',
      category: 'Grade A',
      description: 'High quality premium rice',
    },
    {
      name: 'Standard Rice',
      category: 'Grade B',
      description: 'Standard quality rice',
    },
    {
      name: 'Bulk Rice',
      category: 'Grade C',
      description: 'Bulk rice in sacks',
    },
    {
      name: 'Organic Rice',
      category: 'Premium',
      description: 'Organic certified rice',
    },
  ];

  for (const riceType of riceTypes) {
    const existing = await prisma.riceType.findFirst({
      where: {
        name: riceType.name,
        category: riceType.category,
      },
    });

    if (!existing) {
      const created = await prisma.riceType.create({
        data: riceType,
      });
      console.log('Created rice type:', created.name);
    } else {
      console.log('Rice type already exists:', riceType.name);
    }
  }

  // Create sample incoming transactions
  const premiumRice = await prisma.riceType.findFirst({
    where: { name: 'Premium Rice' },
  });
  const standardRice = await prisma.riceType.findFirst({
    where: { name: 'Standard Rice' },
  });

  if (premiumRice && standardRice) {
    const incomingTransactions = [
      {
        date: new Date('2024-01-15'),
        riceTypeId: premiumRice.id,
        quantity: 5000,
        supplier: 'PT Supplier A',
        notes: 'Initial stock',
      },
      {
        date: new Date('2024-01-20'),
        riceTypeId: standardRice.id,
        quantity: 10000,
        supplier: 'PT Supplier B',
        notes: 'Regular delivery',
      },
      {
        date: new Date('2024-02-01'),
        riceTypeId: premiumRice.id,
        quantity: 3000,
        supplier: 'PT Supplier A',
        notes: 'Monthly restock',
      },
    ];

    for (const transaction of incomingTransactions) {
      const created = await prisma.incomingTransaction.create({
        data: transaction,
      });

      await prisma.stockHistory.create({
        data: {
          riceTypeId: transaction.riceTypeId,
          date: transaction.date,
          quantity: transaction.quantity,
          type: 'incoming',
          transactionId: created.id,
        },
      });

      console.log('Created incoming transaction:', created.id);
    }

    // Create sample outgoing transactions
    const outgoingTransactions = [
      {
        date: new Date('2024-01-18'),
        riceTypeId: premiumRice.id,
        quantity: 2000,
        destination: 'Customer A',
        notes: 'Regular order',
      },
      {
        date: new Date('2024-01-25'),
        riceTypeId: standardRice.id,
        quantity: 5000,
        destination: 'Customer B',
        notes: 'Bulk order',
      },
    ];

    for (const transaction of outgoingTransactions) {
      const created = await prisma.outgoingTransaction.create({
        data: transaction,
      });

      await prisma.stockHistory.create({
        data: {
          riceTypeId: transaction.riceTypeId,
          date: transaction.date,
          quantity: transaction.quantity,
          type: 'outgoing',
          transactionId: created.id,
        },
      });

      console.log('Created outgoing transaction:', created.id);
    }
  }

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
