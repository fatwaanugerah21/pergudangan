import express, { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type, riceTypeId, supplierId, destinationId, paymentStatus } = req.query;

    const baseWhere: {
      date?: { gte?: Date; lte?: Date };
      riceTypeId?: string;
    } = {};
    if (startDate || endDate) {
      baseWhere.date = {};
      if (startDate) baseWhere.date.gte = new Date((startDate as string) + 'T00:00:00');
      if (endDate) baseWhere.date.lte = new Date((endDate as string) + 'T23:59:59.999');
    }
    if (riceTypeId) baseWhere.riceTypeId = riceTypeId as string;

    const data: Array<{
      id: string;
      date: Date;
      riceTypeId: string;
      quantity: number;
      notes?: string | null;
      createdAt: Date;
      updatedAt: Date;
      riceType?: {
        id: string;
        name: string;
        description?: string | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
      transactionType: 'incoming' | 'outgoing';
      supplier?: { id: string; name: string; alamat: string | null; createdAt: Date; updatedAt: Date } | null;
      destinationId?: string;
      destination?: {
        id: string;
        name: string;
        type: string;
        alamat?: string | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
    }> = [];

    if (type === 'incoming' || !type) {
      const incomingWhere = { ...baseWhere } as any;
      if (supplierId) incomingWhere.supplierId = supplierId as string;
      const incoming = await prisma.incomingTransaction.findMany({
        where: incomingWhere,
        include: {
          riceType: true,
          supplier: true,
        },
        orderBy: { date: 'desc' },
      });
      data.push(...incoming.map(t => ({
        ...t,
        transactionType: 'incoming' as const,
      })));
    }

    if (type === 'outgoing' || !type) {
      const outgoingWhere = { ...baseWhere } as Record<string, unknown>;
      if (destinationId) outgoingWhere.destinationId = destinationId as string;
      if (paymentStatus === 'full') {
        outgoingWhere.paymentStatus = 'full';
      } else if (paymentStatus === 'unpaid') {
        outgoingWhere.paymentStatus = { in: ['partial', 'unpaid'] };
      }
      const outgoing = await prisma.outgoingTransaction.findMany({
        where: outgoingWhere,
        include: {
          riceType: true,
          destination: true,
        },
        orderBy: { date: 'desc' },
      });
      data.push(...outgoing.map(t => ({
        ...t,
        transactionType: 'outgoing' as const,
        destinationId: t.destinationId,
      })));
    }

    // Sort by date
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(data);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
