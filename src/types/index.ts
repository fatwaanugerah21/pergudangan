export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface RiceType {
  id: string;
  name: string;
  unit: 'kg' | 'sack';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Destination {
  id: string;
  name: string;
  type: string;
  alamat?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  alamat?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomingTransaction {
  id: string;
  date: string;
  riceTypeId: string;
  quantity: number;
  supplierId: string;
  paymentAmount?: number | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  riceType?: RiceType;
  supplier?: Supplier;
}

export interface OutgoingTransaction {
  id: string;
  date: string;
  riceTypeId: string;
  quantity: number;
  destinationId: string;
  paymentAmount?: number | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  riceType?: RiceType;
  destination?: Destination;
}

export interface StockHistory {
  id: string;
  riceTypeId: string;
  date: string;
  quantity: number;
  type: 'incoming' | 'outgoing';
  transactionId?: string;
  createdAt: string;
  riceType?: RiceType;
}

export interface StockData {
  riceType: RiceType;
  currentStock: number;
}

export interface DashboardData {
  totalStock: number;
  totalIncoming: number;
  totalOutgoing: number;
  lowStockWarnings: Array<{
    riceType: RiceType;
    currentStock: number;
    unit: string;
  }>;
}

export interface DashboardChartsData {
  chartStartDate?: string;
  chartEndDate?: string;
  chartDayCount?: number;
  stockByRiceType: Array<{ riceTypeName: string; quantity: number; unit?: string }>;
  incomingDaily: Array<{ date: string; quantity: number }>;
  incomingDailyByRiceType?: Array<Record<string, string | number>>;
  incomingDailyAmount?: Array<{ date: string; amount: number }>;
  totalIncomingAmount?: number;
  incomingTransactionCount?: number;
  incomingAveragePerDayKg?: number;
  incomingAveragePerDayRp?: number;
  outgoingDaily: Array<{ date: string; quantity: number }>;
  outgoingDailyByRiceType?: Array<Record<string, string | number>>;
  outgoingDailyAmount?: Array<{ date: string; amount: number }>;
  totalOutgoingAmount?: number;
  outgoingTransactionCount?: number;
  outgoingAveragePerDayKg?: number;
  outgoingAveragePerDayRp?: number;
  topDestinations?: Array<{ name: string; quantity: number }>;
  topRiceTypes?: Array<{ name: string; quantity: number }>;
  averagePricePerKg?: number;
}

export interface ReportItem extends IncomingTransaction, OutgoingTransaction {
  transactionType: 'incoming' | 'outgoing';
}
