import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, startDate, endDate } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status as string;
    if (startDate || endDate) {
      where.scheduledDeliveryDate = {};
      if (startDate) (where.scheduledDeliveryDate as Record<string, Date>).gte = new Date((startDate as string) + 'T00:00:00');
      if (endDate) (where.scheduledDeliveryDate as Record<string, Date>).lte = new Date((endDate as string) + 'T23:59:59.999');
    }
    const orders = await prisma.deliveryOrder.findMany({
      where,
      include: {
        riceType: true,
        destination: true,
      },
      orderBy: { scheduledDeliveryDate: 'asc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/upcoming', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 7);
    const orders = await prisma.deliveryOrder.findMany({
      where: {
        status: { in: ['pending', 'dispatched'] },
        scheduledDeliveryDate: { gte: now, lte: weekLater },
      },
      include: { riceType: true, destination: true },
      orderBy: { scheduledDeliveryDate: 'asc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching upcoming deliveries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: { riceType: true, destination: true },
    });
    if (!order) {
      res.status(404).json({ error: 'Delivery order not found' });
      return;
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching delivery order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface CreateDeliveryOrderRequest {
  destinationId: string;
  riceTypeId: string;
  quantity: number | string;
  scheduledDeliveryDate: string;
  deliveryAddress?: string;
  notes?: string;
}

router.post('/', async (req: Request<{}, {}, CreateDeliveryOrderRequest>, res: Response) => {
  try {
    const { destinationId, riceTypeId, quantity, scheduledDeliveryDate, deliveryAddress, notes } = req.body;
    if (!destinationId || !riceTypeId || !quantity || !scheduledDeliveryDate) {
      res.status(400).json({ error: 'Destination, rice type, quantity, and scheduled delivery date are required' });
      return;
    }
    if (parseFloat(quantity.toString()) <= 0) {
      res.status(400).json({ error: 'Quantity must be greater than 0' });
      return;
    }
    const order = await prisma.deliveryOrder.create({
      data: {
        destinationId,
        riceTypeId,
        quantity: parseFloat(quantity.toString()),
        scheduledDeliveryDate: new Date(scheduledDeliveryDate),
        deliveryAddress: deliveryAddress || null,
        notes: notes || null,
      },
      include: { riceType: true, destination: true },
    });
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating delivery order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateDeliveryOrderRequest {
  destinationId?: string;
  riceTypeId?: string;
  quantity?: number | string;
  scheduledDeliveryDate?: string;
  deliveryAddress?: string;
  status?: string;
  notes?: string;
}

router.put('/:id', async (req: Request<{ id: string }, {}, UpdateDeliveryOrderRequest>, res: Response) => {
  try {
    const { destinationId, riceTypeId, quantity, scheduledDeliveryDate, deliveryAddress, status, notes } = req.body;
    const existing = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Delivery order not found' });
      return;
    }
    const data: Record<string, unknown> = {};
    if (destinationId) data.destinationId = destinationId;
    if (riceTypeId) data.riceTypeId = riceTypeId;
    if (quantity != null) data.quantity = parseFloat(quantity.toString());
    if (scheduledDeliveryDate) data.scheduledDeliveryDate = new Date(scheduledDeliveryDate);
    if (deliveryAddress !== undefined) data.deliveryAddress = deliveryAddress || null;
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes || null;

    const order = await prisma.deliveryOrder.update({
      where: { id: req.params.id },
      data,
      include: { riceType: true, destination: true },
    });
    res.json(order);
  } catch (error) {
    console.error('Error updating delivery order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const existing = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Delivery order not found' });
      return;
    }
    await prisma.deliveryOrder.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting delivery order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
