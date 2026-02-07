import express, { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, riceTypeId, destinationId } = req.query;

    const where: {
      date?: {
        gte?: Date;
        lte?: Date;
      };
      riceTypeId?: string;
      destinationId?: string;
    } = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date((startDate as string) + 'T00:00:00');
      if (endDate) where.date.lte = new Date((endDate as string) + 'T23:59:59.999');
    }
    if (riceTypeId) where.riceTypeId = riceTypeId as string;
    if (destinationId) where.destinationId = destinationId as string;

    const transactions = await prisma.outgoingTransaction.findMany({
      where,
      include: {
        riceType: true,
        destination: true,
      },
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching outgoing transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await prisma.outgoingTransaction.findUnique({
      where: { id: req.params.id },
      include: {
        riceType: true,
        destination: true,
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

interface CreateOutgoingRequest {
  date: string;
  riceTypeId: string;
  quantity: number | string;
  destinationId: string;
  destinationName?: string;
  paymentAmount?: number | string;
  notes?: string;
}

router.post('/', async (req: Request<{}, {}, CreateOutgoingRequest>, res: Response) => {
  try {
    const { date, riceTypeId, quantity, destinationId, destinationName, paymentAmount, notes } = req.body;

    if (!date || !riceTypeId || !quantity) {
      res.status(400).json({ error: 'Date, rice type, and quantity are required' });
      return;
    }

    // Handle destination: if destinationId is provided, use it; if destinationName is provided, create or find it
    let finalDestinationId = destinationId;
    if (!finalDestinationId && destinationName) {
      // Try to find existing destination
      let destination = await prisma.destination.findUnique({
        where: { name: destinationName },
      });

      // If not found, create new one
      if (!destination) {
        destination = await prisma.destination.create({
          data: {
            name: destinationName,
            type: 'customer',
          },
        });
      }
      finalDestinationId = destination.id;
    }

    if (!finalDestinationId) {
      res.status(400).json({ error: 'Destination is required' });
      return;
    }

    if (parseFloat(quantity.toString()) <= 0) {
      res.status(400).json({ error: 'Quantity must be greater than 0' });
      return;
    }

    // Check stock availability
    const stockHistory = await prisma.stockHistory.findMany({
      where: { riceTypeId },
    });

    const currentStock = stockHistory.reduce((sum, record) => {
      return sum + (record.type === 'incoming' ? record.quantity : -record.quantity);
    }, 0);

    if (currentStock < parseFloat(quantity.toString())) {
      const riceType = await prisma.riceType.findUnique({
        where: { id: riceTypeId },
      });
      res.status(400).json({
        error: `Stok tidak mencukupi. Stok tersedia: ${currentStock.toFixed(2)} ${riceType?.unit || 'kg'}, jumlah yang diminta: ${parseFloat(quantity.toString()).toFixed(2)} ${riceType?.unit || 'kg'}`
      });
      return;
    }

    // Create transaction and stock history in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.outgoingTransaction.create({
        data: {
          date: new Date(date),
          riceTypeId,
          quantity: parseFloat(quantity.toString()),
          destinationId: finalDestinationId,
          paymentAmount: paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : null,
          notes: notes || null,
        },
        include: {
          riceType: true,
          destination: true,
        },
      });

      await tx.stockHistory.create({
        data: {
          riceTypeId,
          date: new Date(date),
          quantity: parseFloat(quantity.toString()),
          type: 'outgoing',
          transactionId: transaction.id,
        },
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating outgoing transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateOutgoingRequest {
  date?: string;
  riceTypeId?: string;
  quantity?: number | string;
  destinationId?: string;
  destinationName?: string;
  paymentAmount?: number | string | null;
  notes?: string;
}

router.put('/:id', async (req: Request<{ id: string }, {}, UpdateOutgoingRequest>, res: Response) => {
  try {
    const { date, riceTypeId, quantity, destinationId, destinationName, paymentAmount, notes } = req.body;

    // Get existing transaction to check if riceTypeId or quantity changed
    const existingTransaction = await prisma.outgoingTransaction.findUnique({
      where: { id: req.params.id },
    });

    if (!existingTransaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const finalRiceTypeId = riceTypeId || existingTransaction.riceTypeId;
    const finalQuantity = quantity ? parseFloat(quantity.toString()) : existingTransaction.quantity;

    // Handle destination update
    let finalDestinationId = destinationId;
    if (!finalDestinationId && destinationName) {
      let destination = await prisma.destination.findUnique({
        where: { name: destinationName },
      });
      if (!destination) {
        destination = await prisma.destination.create({
          data: {
            name: destinationName,
            type: 'customer',
          },
        });
      }
      finalDestinationId = destination.id;
    } else if (!finalDestinationId && existingTransaction.destinationId) {
      // If no new destinationId or name, keep existing
      finalDestinationId = existingTransaction.destinationId;
    }

    if (!finalDestinationId) {
      res.status(400).json({ error: 'Destination is required' });
      return;
    }

    // Check stock availability if quantity or riceTypeId changed
    if (quantity || riceTypeId) {
      // Get current stock for the rice type
      const stockHistory = await prisma.stockHistory.findMany({
        where: { riceTypeId: finalRiceTypeId },
      });

      // Calculate current stock excluding the existing transaction
      const currentStock = stockHistory.reduce((sum, record) => {
        // Exclude the existing outgoing transaction from calculation
        if (record.transactionId === existingTransaction.id && record.type === 'outgoing') {
          return sum; // Don't subtract this one as we'll replace it
        }
        return sum + (record.type === 'incoming' ? record.quantity : -record.quantity);
      }, 0);

      // Add back the existing transaction quantity (if it's for the same rice type)
      const adjustedStock = existingTransaction.riceTypeId === finalRiceTypeId
        ? currentStock + existingTransaction.quantity
        : currentStock;

      if (adjustedStock < finalQuantity) {
        const riceType = await prisma.riceType.findUnique({
          where: { id: finalRiceTypeId },
        });
        res.status(400).json({
          error: `Stok tidak mencukupi. Stok tersedia: ${adjustedStock.toFixed(2)} ${riceType?.unit || 'kg'}, jumlah yang diminta: ${finalQuantity.toFixed(2)} ${riceType?.unit || 'kg'}`
        });
        return;
      }
    }

    // Update stock history if quantity or riceTypeId changed
    if (quantity || riceTypeId) {
      await prisma.$transaction(async (tx) => {
        // Delete old stock history entry if quantity or riceTypeId changed
        await tx.stockHistory.deleteMany({
          where: { transactionId: existingTransaction.id },
        });

        // Update transaction
        await tx.outgoingTransaction.update({
          where: { id: req.params.id },
          data: {
            date: date ? new Date(date) : undefined,
            riceTypeId: finalRiceTypeId,
            quantity: finalQuantity,
            destinationId: finalDestinationId,
            paymentAmount: paymentAmount !== undefined ? (paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : null) : undefined,
            notes: notes !== undefined ? notes : undefined,
          },
        });

        // Create new stock history entry if quantity or riceTypeId changed
        await tx.stockHistory.create({
          data: {
            riceTypeId: finalRiceTypeId,
            date: date ? new Date(date) : existingTransaction.date,
            quantity: finalQuantity,
            type: 'outgoing',
            transactionId: existingTransaction.id,
          },
        });
      });
    } else {
      // Just update transaction without changing stock history
      await prisma.outgoingTransaction.update({
        where: { id: req.params.id },
        data: {
          date: date ? new Date(date) : undefined,
          destinationId: finalDestinationId,
          paymentAmount: paymentAmount !== undefined ? (paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : null) : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });
    }

    const transaction = await prisma.outgoingTransaction.findUnique({
      where: { id: req.params.id },
      include: {
        riceType: true,
        destination: true,
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
    // Delete transaction and associated stock history in a transaction
    // Deleting stock history will automatically return the stock to warehouse
    await prisma.$transaction(async (tx) => {
      // Delete stock history entry first (this will return stock to warehouse)
      await tx.stockHistory.deleteMany({
        where: { transactionId: req.params.id },
      });

      // Then delete the transaction
      await tx.outgoingTransaction.delete({
        where: { id: req.params.id },
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
