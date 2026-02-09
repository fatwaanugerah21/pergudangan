import express, { Request, Response, Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, riceTypeId, supplierId } = req.query;

    const where: {
      date?: {
        gte?: Date;
        lte?: Date;
      };
      riceTypeId?: string;
      supplierId?: string;
    } = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date((startDate as string) + 'T00:00:00');
      if (endDate) where.date.lte = new Date((endDate as string) + 'T23:59:59.999');
    }
    if (riceTypeId) where.riceTypeId = riceTypeId as string;
    if (supplierId) where.supplierId = supplierId as string;

    const transactions = await prisma.incomingTransaction.findMany({
      where,
      include: {
        riceType: true,
        supplier: true,
      },
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching incoming transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await prisma.incomingTransaction.findUnique({
      where: { id: req.params.id as string },
      include: {
        riceType: true,
      },
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface CreateIncomingRequest {
  date: string;
  riceTypeId: string;
  quantity: number | string;
  supplierId: string;
  supplierName?: string;
  paymentAmount?: number | string;
  notes?: string;
}

router.post('/', async (req: Request<{}, {}, CreateIncomingRequest>, res: Response) => {
  try {
    const { date, riceTypeId, quantity, supplierId, supplierName, paymentAmount, notes } = req.body;

    if (!date || !riceTypeId || !quantity) {
      res.status(400).json({ error: 'Date, rice type, and quantity are required' });
      return;
    }

    // Handle supplier: if supplierId is provided, use it; if supplierName is provided, create or find it
    let finalSupplierId = supplierId;
    if (!finalSupplierId && supplierName) {
      // Try to find existing supplier
      let supplier = await prisma.supplier.findUnique({
        where: { name: supplierName },
      });

      // If not found, create new one
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name: supplierName,
          },
        });
      }
      finalSupplierId = supplier.id;
    }

    if (!finalSupplierId) {
      res.status(400).json({ error: 'Supplier is required' });
      return;
    }

    if (parseFloat(quantity.toString()) <= 0) {
      res.status(400).json({ error: 'Quantity must be greater than 0' });
      return;
    }

    // Create transaction and stock history in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.incomingTransaction.create({
        data: {
          date: new Date(date),
          riceTypeId,
          quantity: parseFloat(quantity.toString()),
          supplierId: finalSupplierId,
          paymentAmount: paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : null,
          notes: notes || null,
        },
        include: {
          riceType: true,
          supplier: true,
        },
      });

      await tx.stockHistory.create({
        data: {
          riceTypeId,
          date: new Date(date),
          quantity: parseFloat(quantity.toString()),
          type: 'incoming',
          transactionId: transaction.id,
        },
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating incoming transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateIncomingRequest {
  date?: string;
  riceTypeId?: string;
  quantity?: number | string;
  supplierId?: string;
  supplierName?: string;
  paymentAmount?: number | string | null;
  notes?: string;
}

router.put('/:id', async (req: Request<{ id: string }, {}, UpdateIncomingRequest>, res: Response) => {
  try {
    const { date, riceTypeId, quantity, supplierId, supplierName, paymentAmount, notes } = req.body;

    // Get existing transaction
    const existingTransaction = await prisma.incomingTransaction.findUnique({
      where: { id: req.params.id as string },
    });

    if (!existingTransaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const finalRiceTypeId = riceTypeId || existingTransaction.riceTypeId;
    const finalQuantity = quantity ? parseFloat(quantity.toString()) : existingTransaction.quantity;

    // Handle supplier update
    let finalSupplierId = supplierId;
    if (!finalSupplierId && supplierName) {
      let supplier = await prisma.supplier.findUnique({
        where: { name: supplierName },
      });
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name: supplierName,
          },
        });
      }
      finalSupplierId = supplier.id;
    } else if (!finalSupplierId && existingTransaction.supplierId) {
      // If no new supplierId or name, keep existing
      finalSupplierId = existingTransaction.supplierId;
    }

    if (!finalSupplierId) {
      res.status(400).json({ error: 'Supplier is required' });
      return;
    }

    // Validate: Check if stock after update will be sufficient for all outgoing transactions
    if (quantity || riceTypeId) {
      // Get all stock history for the rice type
      const stockHistory = await prisma.stockHistory.findMany({
        where: { riceTypeId: finalRiceTypeId },
      });

      // Calculate current stock excluding the existing incoming transaction
      let currentStock = stockHistory.reduce((sum, record) => {
        // Exclude the existing incoming transaction from calculation
        if (record.transactionId === existingTransaction.id && record.type === 'incoming') {
          return sum; // Don't add this one as we'll replace it
        }
        return sum + (record.type === 'incoming' ? record.quantity : -record.quantity);
      }, 0);

      // Add the new quantity (or keep existing if not changed)
      currentStock += finalQuantity;

      // Get total outgoing quantity for this rice type
      const outgoingTransactions = await prisma.outgoingTransaction.findMany({
        where: { riceTypeId: finalRiceTypeId },
      });

      const totalOutgoing = outgoingTransactions.reduce((sum, t) => sum + t.quantity, 0);

      // Check if stock after update is sufficient
      if (currentStock < totalOutgoing) {
        const riceType = await prisma.riceType.findUnique({
          where: { id: finalRiceTypeId },
        });
        res.status(400).json({
          error: `Tidak dapat mengupdate pemasukan. Stok setelah update (${currentStock.toFixed(2)} kg) akan lebih kecil dari total penjualan (${totalOutgoing.toFixed(2)} kg)`
        });
        return;
      }

      // Update stock history if quantity or riceTypeId changed
      await prisma.$transaction(async (tx) => {
        // Delete old stock history entry
        await tx.stockHistory.deleteMany({
          where: { transactionId: existingTransaction.id },
        });

        // Update transaction
        await tx.incomingTransaction.update({
          where: { id: req.params.id as string },
          data: {
            date: date ? new Date(date) : undefined,
            riceTypeId: finalRiceTypeId,
            quantity: finalQuantity,
            supplierId: finalSupplierId,
            paymentAmount: paymentAmount !== undefined ? (paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : null) : undefined,
            notes: notes !== undefined ? notes : undefined,
          },
        });

        // Create new stock history entry
        await tx.stockHistory.create({
          data: {
            riceTypeId: finalRiceTypeId,
            date: date ? new Date(date) : existingTransaction.date,
            quantity: finalQuantity,
            type: 'incoming',
            transactionId: existingTransaction.id,
          },
        });
      });
    } else {
      // Just update transaction without changing stock history
      await prisma.incomingTransaction.update({
        where: { id: req.params.id as string },
        data: {
          date: date ? new Date(date) : undefined,
          supplierId: finalSupplierId,
          paymentAmount: paymentAmount !== undefined ? (paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : null) : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });
    }

    const transaction = await prisma.incomingTransaction.findUnique({
      where: { id: req.params.id as string },
      include: {
        riceType: true,
        supplier: true,
      },
    });

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Get existing transaction to check rice type and quantity
    const existingTransaction = await prisma.incomingTransaction.findUnique({
      where: { id: req.params.id as string },
    });

    if (!existingTransaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    // Validate: Check if stock after delete will be sufficient for all outgoing transactions
    const stockHistory = await prisma.stockHistory.findMany({
      where: { riceTypeId: existingTransaction.riceTypeId },
    });

    // Calculate current stock
    let currentStock = stockHistory.reduce((sum, record) => {
      return sum + (record.type === 'incoming' ? record.quantity : -record.quantity);
    }, 0);

    // Calculate stock after deleting this incoming transaction
    const stockAfterDelete = currentStock - existingTransaction.quantity;

    // Get total outgoing quantity for this rice type
    const outgoingTransactions = await prisma.outgoingTransaction.findMany({
      where: { riceTypeId: existingTransaction.riceTypeId },
    });

    const totalOutgoing = outgoingTransactions.reduce((sum, t) => sum + t.quantity, 0);

    // Check if stock after delete is sufficient
    if (stockAfterDelete < totalOutgoing) {
      const riceType = await prisma.riceType.findUnique({
        where: { id: existingTransaction.riceTypeId },
      });
      res.status(400).json({
        error: `Tidak dapat menghapus pemasukan. Stok setelah dihapus (${stockAfterDelete.toFixed(2)} kg) akan lebih kecil dari total penjualan (${totalOutgoing.toFixed(2)} kg)`
      });
      return;
    }

    // Delete transaction and associated stock history in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete stock history entry first (this will reduce stock)
      await tx.stockHistory.deleteMany({
        where: { transactionId: req.params.id as string },
      });

      // Then delete the transaction
      await tx.incomingTransaction.delete({
        where: { id: req.params.id as string },
      });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
