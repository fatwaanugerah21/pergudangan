import express, { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, riceTypeId, destinationId, paymentStatus } = req.query;

    const where: {
      date?: {
        gte?: Date;
        lte?: Date;
      };
      riceTypeId?: string;
      destinationId?: string;
      paymentStatus?: string | { in: string[] };
    } = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date((startDate as string) + 'T00:00:00');
      if (endDate) where.date.lte = new Date((endDate as string) + 'T23:59:59.999');
    }
    if (riceTypeId) where.riceTypeId = riceTypeId as string;
    if (destinationId) where.destinationId = destinationId as string;
    if (paymentStatus === 'full') {
      where.paymentStatus = 'full';
    } else if (paymentStatus === 'unpaid') {
      where.paymentStatus = { in: ['partial', 'unpaid'] };
    }

    const transactions = await prisma.outgoingTransaction.findMany({
      where,
      include: {
        riceType: true,
        destination: true,
        installments: { orderBy: { dueDate: 'asc' } },
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
        installments: { orderBy: { dueDate: 'asc' } },
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

interface InstallmentInput {
  amount: number;
  dueDate: string;
}

interface CreateOutgoingRequest {
  date: string;
  riceTypeId: string;
  quantity: number | string;
  destinationId: string;
  destinationName?: string;
  paymentAmount?: number | string;
  paymentStatus?: 'full' | 'partial' | 'unpaid';
  totalAmount?: number | string;
  downPayment?: number | string;
  installments?: InstallmentInput[];
  scheduledDeliveryDate?: string | null;
  notes?: string;
}

router.post('/', async (req: Request<{}, {}, CreateOutgoingRequest>, res: Response) => {
  try {
    const { date, riceTypeId, quantity, destinationId, destinationName, paymentStatus, totalAmount, downPayment, paymentAmount, installments, scheduledDeliveryDate, notes } = req.body;

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

    const qty = parseFloat(quantity.toString());
    const payAmt = paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : 0;
    const totAmtNum = totalAmount != null && totalAmount !== '' ? parseFloat(totalAmount.toString()) : null;
    const payStatus = paymentStatus || (totAmtNum != null && payAmt >= totAmtNum ? 'full' : payAmt > 0 ? 'partial' : 'unpaid');
    const totAmt = totAmtNum ?? payAmt;
    const dpAmt = downPayment != null && downPayment !== '' ? parseFloat(downPayment.toString()) : null;

    const raw = scheduledDeliveryDate && String(scheduledDeliveryDate).trim();
    const deliveryDate = raw
      ? (raw.length > 10 && raw.includes('T') ? new Date(raw) : new Date(raw + 'T12:00:00'))
      : null;
    if (deliveryDate && isNaN(deliveryDate.getTime())) {
      res.status(400).json({ error: 'Invalid scheduled delivery date/time' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.outgoingTransaction.create({
        data: {
          date: new Date(date),
          riceTypeId,
          quantity: qty,
          destinationId: finalDestinationId,
          paymentAmount: payAmt,
          paymentStatus: payStatus,
          totalAmount: totAmt,
          downPayment: dpAmt,
          scheduledDeliveryDate: deliveryDate,
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
          quantity: qty,
          type: 'outgoing',
          transactionId: transaction.id,
        },
      });

      // When customer pays on sale, create one installment record (date = sale date, amount = paid)
      const saleDate = new Date(date);
      if (payAmt > 0) {
        await tx.installment.create({
          data: {
            outgoingTransactionId: transaction.id,
            amount: payAmt,
            dueDate: saleDate,
            paidAmount: payAmt,
            paidAt: saleDate,
          },
        });
      }

      if (installments && Array.isArray(installments) && installments.length > 0) {
        for (const inst of installments) {
          if (inst.amount > 0 && inst.dueDate) {
            await tx.installment.create({
              data: {
                outgoingTransactionId: transaction.id,
                amount: parseFloat(inst.amount.toString()),
                dueDate: new Date(inst.dueDate),
              },
            });
          }
        }
      }

      if (deliveryDate) {
        await tx.deliveryOrder.create({
          data: {
            outgoingTransactionId: transaction.id,
            destinationId: finalDestinationId,
            riceTypeId,
            quantity: qty,
            scheduledDeliveryDate: deliveryDate,
          },
        });
      }

      return tx.outgoingTransaction.findUnique({
        where: { id: transaction.id },
        include: {
          riceType: true,
          destination: true,
          installments: { orderBy: { dueDate: 'asc' } },
        },
      });
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
  totalAmount?: number | string | null;
  paymentAmount?: number | string | null;
  scheduledDeliveryDate?: string | null;
  notes?: string;
}

router.put('/:id', async (req: Request<{ id: string }, {}, UpdateOutgoingRequest>, res: Response) => {
  try {
    const { date, riceTypeId, quantity, destinationId, destinationName, totalAmount, paymentAmount, scheduledDeliveryDate, notes } = req.body;

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
        const raw = scheduledDeliveryDate != null && String(scheduledDeliveryDate).trim();
        const deliveryDate = scheduledDeliveryDate !== undefined
          ? (raw ? (raw.length > 10 && raw.includes('T') ? new Date(raw) : new Date(raw + 'T12:00:00')) : null)
          : undefined;
        const updateData: Record<string, unknown> = {
          date: date ? new Date(date) : undefined,
          riceTypeId: finalRiceTypeId,
          quantity: finalQuantity,
          destinationId: finalDestinationId,
          totalAmount: totalAmount !== undefined ? (totalAmount != null && totalAmount !== '' ? parseFloat(totalAmount.toString()) : null) : undefined,
          paymentAmount: paymentAmount !== undefined ? (paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : null) : undefined,
          scheduledDeliveryDate: deliveryDate !== undefined ? deliveryDate : undefined,
          notes: notes !== undefined ? notes : undefined,
        };
        if (paymentAmount !== undefined) {
          const newPay = paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : 0;
          const total = (totalAmount != null && totalAmount !== '' ? parseFloat(totalAmount.toString()) : null) ?? existingTransaction.totalAmount ?? existingTransaction.paymentAmount ?? 0;
          updateData.paymentStatus = newPay >= total ? 'full' : newPay > 0 ? 'partial' : 'unpaid';
        }
        await tx.outgoingTransaction.update({
          where: { id: req.params.id },
          data: updateData,
        });

        if (deliveryDate !== undefined) {
          const existing = await tx.deliveryOrder.findFirst({ where: { outgoingTransactionId: req.params.id } });
          if (deliveryDate) {
            if (existing) {
              await tx.deliveryOrder.update({
                where: { id: existing.id },
                data: { destinationId: finalDestinationId, riceTypeId: finalRiceTypeId, quantity: finalQuantity, scheduledDeliveryDate: deliveryDate },
              });
            } else {
              await tx.deliveryOrder.create({
                data: {
                  outgoingTransactionId: req.params.id,
                  destinationId: finalDestinationId,
                  riceTypeId: finalRiceTypeId,
                  quantity: finalQuantity,
                  scheduledDeliveryDate: deliveryDate,
                },
              });
            }
          } else if (existing) {
            await tx.deliveryOrder.update({ where: { id: existing.id }, data: { status: 'cancelled' } });
          }
        }

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
      const raw = scheduledDeliveryDate != null && String(scheduledDeliveryDate).trim();
      const deliveryDate = scheduledDeliveryDate !== undefined
        ? (raw ? (raw.length > 10 && raw.includes('T') ? new Date(raw) : new Date(raw + 'T12:00:00')) : null)
        : undefined;
      const updateData: Record<string, unknown> = {
        date: date ? new Date(date) : undefined,
        destinationId: finalDestinationId,
        totalAmount: totalAmount !== undefined ? (totalAmount != null && totalAmount !== '' ? parseFloat(totalAmount.toString()) : null) : undefined,
        paymentAmount: paymentAmount !== undefined ? (paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : null) : undefined,
        scheduledDeliveryDate: deliveryDate !== undefined ? deliveryDate : undefined,
        notes: notes !== undefined ? notes : undefined,
      };
      if (paymentAmount !== undefined) {
        const newPay = paymentAmount != null && paymentAmount !== '' ? parseFloat(paymentAmount.toString()) : 0;
        const total = (totalAmount != null && totalAmount !== '' ? parseFloat(totalAmount.toString()) : null) ?? existingTransaction.totalAmount ?? existingTransaction.paymentAmount ?? 0;
        updateData.paymentStatus = newPay >= total ? 'full' : newPay > 0 ? 'partial' : 'unpaid';
      }
      await prisma.outgoingTransaction.update({
        where: { id: req.params.id },
        data: updateData,
      });
      if (deliveryDate !== undefined) {
        const existing = await prisma.deliveryOrder.findFirst({ where: { outgoingTransactionId: req.params.id } });
        if (deliveryDate) {
          if (existing) {
            await prisma.deliveryOrder.update({
              where: { id: existing.id },
              data: { destinationId: finalDestinationId, riceTypeId: existingTransaction.riceTypeId, quantity: existingTransaction.quantity, scheduledDeliveryDate: deliveryDate },
            });
          } else {
            await prisma.deliveryOrder.create({
              data: {
                outgoingTransactionId: req.params.id,
                destinationId: finalDestinationId,
                riceTypeId: existingTransaction.riceTypeId,
                quantity: existingTransaction.quantity,
                scheduledDeliveryDate: deliveryDate,
              },
            });
          }
        } else if (existing) {
          await prisma.deliveryOrder.update({ where: { id: existing.id }, data: { status: 'cancelled' } });
        }
      }
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
