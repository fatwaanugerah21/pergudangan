import express, { Request, Response, Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Get all suppliers with statistics
router.get('/', async (_req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        incomingTransactions: true,
      },
    });

    const suppliersWithStats = suppliers.map((supplier) => {
      const totalPemasokan = supplier.incomingTransactions.reduce(
        (sum, t) => sum + t.quantity,
        0
      );
      const jumlahTransaksi = supplier.incomingTransactions.length;

      return {
        id: supplier.id,
        name: supplier.name,
        alamat: supplier.alamat,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
        totalPemasokan,
        jumlahTransaksi,
      };
    });

    res.json(suppliersWithStats);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single supplier by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) {
      res.status(400).json({ error: 'Invalid supplier id' });
      return;
    }
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface CreateSupplierRequest {
  name: string;
  alamat?: string;
}

// Create supplier
router.post('/', async (req: Request<{}, {}, CreateSupplierRequest>, res: Response) => {
  try {
    const { name, alamat } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Check if supplier already exists
    const existing = await prisma.supplier.findUnique({
      where: { name },
    });

    if (existing) {
      res.json(existing); // Return existing if found
      return;
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        alamat: alamat || null,
      },
    });
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(400).json({ error: 'Supplier with this name already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateSupplierRequest {
  name?: string;
  alamat?: string;
}

// Update supplier
router.put('/:id', async (req: Request<{ id: string }, {}, UpdateSupplierRequest>, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) {
      res.status(400).json({ error: 'Invalid supplier id' });
      return;
    }
    const { name, alamat } = req.body;
    try {
      const supplier = await prisma.supplier.update({
        where: { id },
        data: {
          name: name || undefined,
          alamat: alamat !== undefined ? (alamat || null) : undefined,
        },
      });
      res.json(supplier);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          res.status(404).json({ error: 'Supplier not found' });
          return;
        }
        if (error.code === 'P2002') {
          res.status(400).json({ error: 'Supplier with this name already exists' });
          return;
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete supplier
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) {
      res.status(400).json({ error: 'Invalid supplier id' });
      return;
    }
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { incomingTransactions: true } } },
    });

    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    if (supplier._count.incomingTransactions > 0) {
      res.status(400).json({
        error: `Cannot delete supplier: has ${supplier._count.incomingTransactions} incoming transaction(s). Remove related transactions first.`
      });
      return;
    }

    await prisma.supplier.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting supplier:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
