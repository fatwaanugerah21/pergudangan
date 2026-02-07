import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get all stock history to calculate total stock
    const allStockHistory = await prisma.stockHistory.findMany();
    const totalStock = allStockHistory.reduce((sum, record) => {
      return sum + (record.type === 'incoming' ? record.quantity : -record.quantity);
    }, 0);

    // Get all incoming transactions (all-time sum for summary card)
    const allIncoming = await prisma.incomingTransaction.findMany({
      select: { quantity: true },
    });
    const totalIncoming = allIncoming.reduce((sum, t) => sum + t.quantity, 0);

    // Get all outgoing transactions (all-time sum for summary card)
    const allOutgoing = await prisma.outgoingTransaction.findMany({
      select: { quantity: true },
    });
    const totalOutgoing = allOutgoing.reduce((sum, t) => sum + t.quantity, 0);

    // Get low stock warnings (stock < 1000 kg or < 20 sacks)
    const riceTypes = await prisma.riceType.findMany();
    const lowStockWarnings: Array<{
      riceType: typeof riceTypes[0];
      currentStock: number;
    }> = [];

    for (const riceType of riceTypes) {
      const history = await prisma.stockHistory.findMany({
        where: { riceTypeId: riceType.id },
      });

      const currentStock = history.reduce((sum, record) => {
        return sum + (record.type === 'incoming' ? record.quantity : -record.quantity);
      }, 0);

      const threshold = 1000;
      if (currentStock < threshold) {
        lowStockWarnings.push({
          riceType,
          currentStock,
        });
      }
    }

    res.json({
      totalStock,
      totalIncoming,
      totalOutgoing,
      lowStockWarnings,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const MAX_CHART_DAYS = 365;

function getChartDateRange(req: Request): { startOfRange: Date; endOfRange: Date; startStr: string; endStr: string; dayCount: number } {
  const now = new Date();
  const endOfRange = new Date(now);
  endOfRange.setHours(23, 59, 59, 999);
  const startStr = req.query.startDate as string | undefined;
  const endStr = req.query.endDate as string | undefined;
  if (startStr && endStr) {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T23:59:59.999');
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start.getTime() <= end.getTime()) {
      const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (days <= MAX_CHART_DAYS) {
        return { startOfRange: start, endOfRange: end, startStr, endStr, dayCount: days };
      }
    }
  }
  const startOfRange = new Date(now);
  startOfRange.setDate(startOfRange.getDate() - 30);
  startOfRange.setHours(0, 0, 0, 0);
  const defStart = startOfRange.toISOString().slice(0, 10);
  const defEnd = now.toISOString().slice(0, 10);
  return { startOfRange, endOfRange: now, startStr: defStart, endStr: defEnd, dayCount: 31 };
}

function getDateKeysBetween(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const endTs = end.getTime();
  while (d.getTime() <= endTs) {
    keys.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

// Chart data for dashboard detail views (custom date range or last 30 days + stock breakdown)
router.get('/charts', async (req: Request, res: Response) => {
  try {
    const { startOfRange, endOfRange, startStr, endStr, dayCount } = getChartDateRange(req);
    const dateKeys = getDateKeysBetween(startOfRange, endOfRange);

    const riceTypes = await prisma.riceType.findMany();

    // Stock by rice type (for Total Stok chart - no date filter)
    const stockByRiceType: Array<{ riceTypeName: string; quantity: number }> = [];
    for (const riceType of riceTypes) {
      const history = await prisma.stockHistory.findMany({
        where: { riceTypeId: riceType.id },
      });
      const currentStock = history.reduce((sum, record) => {
        return sum + (record.type === 'incoming' ? record.quantity : -record.quantity);
      }, 0);
      stockByRiceType.push({ riceTypeName: riceType.name, quantity: currentStock });
    }

    // Incoming in date range
    const incomingTx = await prisma.incomingTransaction.findMany({
      where: { date: { gte: startOfRange, lte: endOfRange } },
      select: {
        date: true,
        quantity: true,
        paymentAmount: true,
        riceType: { select: { name: true } },
      },
    });
    const incomingByDay = new Map<string, number>();
    const incomingAmountByDay = new Map<string, number>();
    const incomingByDayByRiceType = new Map<string, Record<string, number>>();
    const riceTypeNames = new Set<string>(riceTypes.map((r) => r.name));
    let totalIncomingAmount = 0;
    for (const key of dateKeys) {
      incomingByDay.set(key, 0);
      incomingAmountByDay.set(key, 0);
      const byType: Record<string, number> = {};
      riceTypeNames.forEach((name) => (byType[name] = 0));
      incomingByDayByRiceType.set(key, byType);
    }
    for (const t of incomingTx) {
      const key = new Date(t.date).toISOString().slice(0, 10);
      if (incomingByDay.has(key)) {
        incomingByDay.set(key, (incomingByDay.get(key) ?? 0) + t.quantity);
        if (t.paymentAmount != null) {
          totalIncomingAmount += t.paymentAmount;
          incomingAmountByDay.set(key, (incomingAmountByDay.get(key) ?? 0) + t.paymentAmount);
        }
        const byType = incomingByDayByRiceType.get(key);
        if (byType && t.riceType?.name) {
          byType[t.riceType.name] = (byType[t.riceType.name] ?? 0) + t.quantity;
        }
      }
    }
    const incomingDaily = Array.from(incomingByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, quantity]) => ({ date, quantity }));
    const incomingDailyAmount = Array.from(incomingAmountByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }));
    const incomingDailyByRiceType = Array.from(incomingByDayByRiceType.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, byType]) => ({ date, ...byType }));
    const totalIncomingQty = incomingDaily.reduce((s, d) => s + d.quantity, 0);
    const incomingTransactionCount = incomingTx.length;
    const incomingAveragePerDayKg = dayCount > 0 ? totalIncomingQty / dayCount : 0;
    const incomingAveragePerDayRp = dayCount > 0 ? totalIncomingAmount / dayCount : 0;

    // Outgoing in date range
    const outgoingTx = await prisma.outgoingTransaction.findMany({
      where: { date: { gte: startOfRange, lte: endOfRange } },
      select: {
        date: true,
        quantity: true,
        paymentAmount: true,
        riceType: { select: { name: true } },
        destination: { select: { name: true } },
      },
    });
    const outgoingByDay = new Map<string, number>();
    const outgoingAmountByDay = new Map<string, number>();
    const outgoingByDayByRiceType = new Map<string, Record<string, number>>();
    let totalOutgoingAmount = 0;
    for (const key of dateKeys) {
      outgoingByDay.set(key, 0);
      outgoingAmountByDay.set(key, 0);
      const byType: Record<string, number> = {};
      riceTypeNames.forEach((name) => (byType[name] = 0));
      outgoingByDayByRiceType.set(key, byType);
    }
    for (const t of outgoingTx) {
      const key = new Date(t.date).toISOString().slice(0, 10);
      if (outgoingByDay.has(key)) {
        outgoingByDay.set(key, (outgoingByDay.get(key) ?? 0) + t.quantity);
        if (t.paymentAmount != null) {
          totalOutgoingAmount += t.paymentAmount;
          outgoingAmountByDay.set(key, (outgoingAmountByDay.get(key) ?? 0) + t.paymentAmount);
        }
        const byType = outgoingByDayByRiceType.get(key);
        if (byType && t.riceType?.name) {
          byType[t.riceType.name] = (byType[t.riceType.name] ?? 0) + t.quantity;
        }
      }
    }
    const outgoingDaily = Array.from(outgoingByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, quantity]) => ({ date, quantity }));
    const outgoingDailyAmount = Array.from(outgoingAmountByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }));
    const outgoingDailyByRiceType = Array.from(outgoingByDayByRiceType.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, byType]) => ({ date, ...byType }));
    const totalOutgoingQty = outgoingDaily.reduce((s, d) => s + d.quantity, 0);
    const outgoingTransactionCount = outgoingTx.length;
    const outgoingAveragePerDayKg = dayCount > 0 ? totalOutgoingQty / dayCount : 0;
    const outgoingAveragePerDayRp = dayCount > 0 ? totalOutgoingAmount / dayCount : 0;
    const outgoingByDestination = new Map<string, number>();
    const outgoingByRice = new Map<string, number>();
    for (const t of outgoingTx) {
      const dest = t.destination?.name ?? 'Lainnya';
      outgoingByDestination.set(dest, (outgoingByDestination.get(dest) ?? 0) + t.quantity);
      const rice = t.riceType?.name ?? 'Lainnya';
      outgoingByRice.set(rice, (outgoingByRice.get(rice) ?? 0) + t.quantity);
    }
    const topDestinations = Array.from(outgoingByDestination.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    const topRiceTypes = Array.from(outgoingByRice.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    const averagePricePerKg = totalOutgoingQty > 0 ? totalOutgoingAmount / totalOutgoingQty : 0;

    res.json({
      chartStartDate: startStr,
      chartEndDate: endStr,
      chartDayCount: dayCount,
      stockByRiceType,
      incomingDaily,
      incomingDailyByRiceType,
      incomingDailyAmount,
      totalIncomingAmount,
      incomingTransactionCount,
      incomingAveragePerDayKg,
      incomingAveragePerDayRp,
      outgoingDaily,
      outgoingDailyByRiceType,
      outgoingDailyAmount,
      totalOutgoingAmount,
      outgoingTransactionCount,
      outgoingAveragePerDayKg,
      outgoingAveragePerDayRp,
      topDestinations,
      topRiceTypes,
      averagePricePerKg,
    });
  } catch (error) {
    console.error('Error fetching dashboard charts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
