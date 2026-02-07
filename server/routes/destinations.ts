import express, { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Get all destinations, optionally filtered by type, with statistics
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const where: { type?: string } = {};
    if (type) {
      where.type = type as string;
    }

    const destinations = await prisma.destination.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        outgoingTransactions: true,
      },
    });

    const destinationsWithStats = destinations.map((destination) => {
      const totalPembelian = destination.outgoingTransactions.reduce(
        (sum, t) => sum + t.quantity,
        0
      );
      const jumlahTransaksi = destination.outgoingTransactions.length;

      return {
        id: destination.id,
        name: destination.name,
        type: destination.type,
        alamat: destination.alamat,
        createdAt: destination.createdAt,
        updatedAt: destination.updatedAt,
        totalPembelian,
        jumlahTransaksi,
      };
    });

    res.json(destinationsWithStats);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single destination by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const destination = await prisma.destination.findUnique({
      where: { id },
    });

    if (!destination) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }

    res.json(destination);
  } catch (error) {
    console.error('Error fetching destination:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface CreateDestinationRequest {
  name: string;
  type?: string;
  alamat?: string;
}

// Create destination
router.post('/', async (req: Request<{}, {}, CreateDestinationRequest>, res: Response) => {
  try {
    const { name, type, alamat } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Check if destination already exists
    const existing = await prisma.destination.findUnique({
      where: { name },
    });

    if (existing) {
      res.json(existing); // Return existing if found
      return;
    }

    const destination = await prisma.destination.create({
      data: {
        name,
        type: type || 'customer', // Default to customer if not provided
        alamat: alamat || null,
      },
    });
    res.status(201).json(destination);
  } catch (error) {
    console.error('Error creating destination:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(400).json({ error: 'Destination with this name already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateDestinationRequest {
  name?: string;
  type?: string;
  alamat?: string;
}

// Update destination
router.put('/:id', async (req: Request<{ id: string }, {}, UpdateDestinationRequest>, res: Response) => {
  try {
    const { name, type, alamat } = req.body;
    try {
      const destination = await prisma.destination.update({
        where: { id: req.params.id },
        data: {
          name: name || undefined,
          type: type || undefined,
          alamat: alamat !== undefined ? (alamat || null) : undefined,
        },
      });
      res.json(destination);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          res.status(404).json({ error: 'Destination not found' });
          return;
        }
        if (error.code === 'P2002') {
          res.status(400).json({ error: 'Destination with this name already exists' });
          return;
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating destination:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete destination
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    // Check if destination has any transactions
    type DestinationWithTransactions = Prisma.DestinationGetPayload<{
      include: { outgoingTransactions: true };
    }>;
    const destination = await prisma.destination.findUnique({
      where: { id },
      include: {
        outgoingTransactions: true,
      },
    }) as DestinationWithTransactions | null;

    if (!destination) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }

    if (destination.outgoingTransactions.length > 0) {
      res.status(400).json({
        error: `Tidak dapat menghapus pelanggan karena sudah memiliki ${destination.outgoingTransactions.length} transaksi penjualan. Hapus semua transaksi terkait terlebih dahulu.`
      });
      return;
    }

    await prisma.destination.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting destination:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
