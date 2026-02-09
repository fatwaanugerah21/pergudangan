import express, { Request, Response, Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router: Router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const riceTypes = await prisma.riceType.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(riceTypes);
  } catch (error) {
    console.error('Error fetching rice types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) {
      res.status(400).json({ error: 'Invalid rice type id' });
      return;
    }
    const riceType = await prisma.riceType.findUnique({
      where: { id },
    });

    if (!riceType) {
      res.status(404).json({ error: 'Rice type not found' });
      return;
    }

    res.json(riceType);
  } catch (error) {
    console.error('Error fetching rice type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface CreateRiceTypeRequest {
  name: string;
  description?: string;
}

router.post('/', async (req: Request<{}, {}, CreateRiceTypeRequest>, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const riceType = await prisma.riceType.create({
      data: {
        name,
        description: description || null,
      },
    });

    res.status(201).json(riceType);
  } catch (error) {
    console.error('Error creating rice type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateRiceTypeRequest {
  name?: string;
  description?: string;
}

router.put('/:id', async (req: Request<{ id: string }, {}, UpdateRiceTypeRequest>, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) {
      res.status(400).json({ error: 'Invalid rice type id' });
      return;
    }
    const { name, description } = req.body;

    try {
      const riceType = await prisma.riceType.update({
        where: { id },
        data: {
          name: name || undefined,
          description: description !== undefined ? description : undefined,
        },
      });

      res.json(riceType);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ error: 'Rice type not found' });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating rice type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) {
      res.status(400).json({ error: 'Invalid rice type id' });
      return;
    }
    try {
      await prisma.riceType.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ error: 'Rice type not found' });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting rice type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
