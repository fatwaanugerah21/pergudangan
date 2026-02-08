import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import riceTypeRoutes from './routes/riceTypes.js';
import incomingRoutes from './routes/incoming.js';
import outgoingRoutes from './routes/outgoing.js';
import stockRoutes from './routes/stock.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import destinationRoutes from './routes/destinations.js';
import supplierRoutes from './routes/suppliers.js';
import installmentRoutes from './routes/installments.js';
import deliveryOrderRoutes from './routes/deliveryOrders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rice-types', riceTypeRoutes);
app.use('/api/incoming', incomingRoutes);
app.use('/api/outgoing', outgoingRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/delivery-orders', deliveryOrderRoutes);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
