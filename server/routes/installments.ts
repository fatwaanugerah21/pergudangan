import express, { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { getTodayAndWeekEndInTimezone, getTimezoneOffsetFromRequest } from '../utils/timezone.js';

const router: Router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /installments - List installments (filter by outgoingTransactionId, overdue, upcoming)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { outgoingTransactionId, status, upcoming } = req.query;
    const where: Record<string, unknown> = {};
    if (outgoingTransactionId) where.outgoingTransactionId = outgoingTransactionId as string;
    if (status === 'overdue') {
      where.dueDate = { lt: new Date() };
      where.paidAt = null;
    } else if (status === 'paid') {
      where.paidAt = { not: null };
    } else if (status === 'pending') {
      where.paidAt = null;
    }
    if (upcoming === 'true') {
      const offsetHours = getTimezoneOffsetFromRequest(req);
      const { startOfToday, endOfWeek } = getTodayAndWeekEndInTimezone(offsetHours);
      where.dueDate = { gte: startOfToday, lte: endOfWeek };
      where.paidAt = null;
    }

    const installments = await prisma.installment.findMany({
      where,
      include: {
        outgoingTransaction: {
          include: {
            riceType: true,
            destination: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
    res.json(installments);
  } catch (error) {
    console.error('Error fetching installments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /installments - Create a payment record (amount + date/time)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { outgoingTransactionId, amount, paidAt } = req.body as {
      outgoingTransactionId: string;
      amount: number;
      paidAt: string;
    };
    if (!outgoingTransactionId || amount == null || amount <= 0) {
      res.status(400).json({ error: 'outgoingTransactionId and positive amount are required' });
      return;
    }
    const paidAtDate = paidAt ? new Date(paidAt) : new Date();
    if (isNaN(paidAtDate.getTime())) {
      res.status(400).json({ error: 'Invalid paidAt date/time' });
      return;
    }

    const outgoing = await prisma.outgoingTransaction.findUnique({
      where: { id: outgoingTransactionId },
    });
    if (!outgoing) {
      res.status(404).json({ error: 'Outgoing transaction not found' });
      return;
    }
    const totalDue = outgoing.totalAmount ?? outgoing.paymentAmount ?? 0;
    const currentPaid = outgoing.paymentAmount ?? 0;
    if (currentPaid + amount > totalDue) {
      res.status(400).json({ error: 'Payment amount would exceed total due' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const installment = await tx.installment.create({
        data: {
          outgoingTransactionId,
          amount,
          dueDate: paidAtDate,
          paidAmount: amount,
          paidAt: paidAtDate,
        },
      });
      const installments = await tx.installment.findMany({
        where: { outgoingTransactionId },
      });
      const newTotalPaid = installments.reduce((sum, i) => sum + (i.paidAmount ?? i.amount), 0);
      const status = newTotalPaid >= totalDue ? 'full' : 'partial';
      await tx.outgoingTransaction.update({
        where: { id: outgoingTransactionId },
        data: {
          paymentAmount: newTotalPaid,
          paymentStatus: status,
        },
      });
      return tx.installment.findUnique({
        where: { id: installment.id },
        include: {
          outgoingTransaction: {
            include: { riceType: true, destination: true, installments: { orderBy: { dueDate: 'asc' } } },
          },
        },
      });
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating installment payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /installments/debt-summary - Transactions with unpaid installments
// Query: destinationId, startDate, endDate, minRemainingDebt, maxRemainingDebt
router.get('/debt-summary', async (req: Request, res: Response) => {
  try {
    const { destinationId, startDate, endDate, minRemainingDebt, maxRemainingDebt } = req.query;
    const where: {
      paymentStatus: { in: string[] };
      destinationId?: string;
      date?: { gte?: Date; lte?: Date };
    } = {
      paymentStatus: { in: ['partial', 'unpaid'] },
    };
    if (destinationId && typeof destinationId === 'string') {
      where.destinationId = destinationId;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate && typeof startDate === 'string') {
        where.date.gte = new Date(startDate + 'T00:00:00');
      }
      if (endDate && typeof endDate === 'string') {
        where.date.lte = new Date(endDate + 'T23:59:59.999');
      }
    }

    let transactions = await prisma.outgoingTransaction.findMany({
      where,
      include: {
        riceType: true,
        destination: true,
        installments: { orderBy: { dueDate: 'asc' } },
      },
      orderBy: { date: 'desc' },
    });

    // Filter by min/max remaining debt (computed: totalAmount - paymentAmount)
    const minDebt = minRemainingDebt != null && minRemainingDebt !== '' ? parseFloat(String(minRemainingDebt)) : null;
    const maxDebt = maxRemainingDebt != null && maxRemainingDebt !== '' ? parseFloat(String(maxRemainingDebt)) : null;
    if (minDebt != null && !isNaN(minDebt)) {
      transactions = transactions.filter((t) => {
        const total = t.totalAmount ?? t.paymentAmount ?? 0;
        const paid = t.paymentAmount ?? 0;
        const remaining = Math.max(0, total - paid);
        return remaining >= minDebt;
      });
    }
    if (maxDebt != null && !isNaN(maxDebt)) {
      transactions = transactions.filter((t) => {
        const total = t.totalAmount ?? t.paymentAmount ?? 0;
        const paid = t.paymentAmount ?? 0;
        const remaining = Math.max(0, total - paid);
        return remaining <= maxDebt;
      });
    }

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching debt summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /installments/:id/pay - Pay an installment
router.post('/:id/pay', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { paidAmount } = req.body as { paidAmount: number };
    const installment = await prisma.installment.findUnique({
      where: { id: req.params.id },
      include: { outgoingTransaction: true },
    });
    if (!installment) {
      res.status(404).json({ error: 'Installment not found' });
      return;
    }
    if (installment.paidAt) {
      res.status(400).json({ error: 'Installment already paid' });
      return;
    }
    const amount = paidAmount ?? installment.amount;
    if (amount <= 0) {
      res.status(400).json({ error: 'Paid amount must be greater than 0' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.installment.update({
        where: { id: req.params.id },
        data: {
          paidAmount: amount,
          paidAt: new Date(),
        },
      });
      const txData = await tx.outgoingTransaction.findUnique({
        where: { id: installment.outgoingTransactionId },
      });
      if (!txData) return;
      const newTotalPaid = (txData.paymentAmount ?? 0) + amount;
      const totalDue = txData.totalAmount ?? txData.paymentAmount ?? 0;
      const status = newTotalPaid >= totalDue ? 'full' : 'partial';
      await tx.outgoingTransaction.update({
        where: { id: installment.outgoingTransactionId },
        data: {
          paymentAmount: newTotalPaid,
          paymentStatus: status,
        },
      });
    });

    const updated = await prisma.installment.findUnique({
      where: { id: req.params.id },
      include: {
        outgoingTransaction: {
          include: { riceType: true, destination: true, installments: true },
        },
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error paying installment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
