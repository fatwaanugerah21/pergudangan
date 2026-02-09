import express, { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Get current stock for all rice types
router.get('/current', async (_req: Request, res: Response) => {
  try {
    const riceTypes = await prisma.riceType.findMany();
    
    const stockData = await Promise.all(
      riceTypes.map(async (riceType) => {
        const history = await prisma.stockHistory.findMany({
          where: { riceTypeId: riceType.id },
        });

        const currentStock = history.reduce((sum, record) => {
          return sum + (record.type === 'incoming' ? record.quantity : -record.quantity);
        }, 0);

        return {
          riceType,
          currentStock,
        };
      })
    );

    res.json(stockData);
  } catch (error) {
    console.error('Error fetching current stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock history for a specific rice type
router.get('/history/:riceTypeId', async (req: Request, res: Response) => {
  try {
    const riceTypeId = typeof req.params.riceTypeId === 'string' ? req.params.riceTypeId : req.params.riceTypeId?.[0];
    if (!riceTypeId) {
      res.status(400).json({ error: 'Invalid rice type id' });
      return;
    }
    const { startDate, endDate, type } = req.query;

    const where: {
      riceTypeId: string;
      date?: { gte?: Date; lte?: Date };
      type?: 'incoming' | 'outgoing';
    } = { riceTypeId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date((startDate as string) + 'T00:00:00');
      if (endDate) where.date.lte = new Date((endDate as string) + 'T23:59:59.999');
    }
    if (type === 'incoming' || type === 'outgoing') where.type = type as 'incoming' | 'outgoing';

    const history = await prisma.stockHistory.findMany({
      where,
      include: {
        riceType: true,
      },
      orderBy: { date: 'desc' },
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all stock history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, riceTypeId, type } = req.query;

    const where: {
      date?: { gte?: Date; lte?: Date };
      riceTypeId?: string;
      type?: 'incoming' | 'outgoing';
    } = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date((startDate as string) + 'T00:00:00');
      if (endDate) where.date.lte = new Date((endDate as string) + 'T23:59:59.999');
    }
    if (riceTypeId) where.riceTypeId = riceTypeId as string;
    if (type === 'incoming' || type === 'outgoing') where.type = type as 'incoming' | 'outgoing';

    const history = await prisma.stockHistory.findMany({
      where,
      include: {
        riceType: true,
      },
      orderBy: { date: 'desc' },
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
