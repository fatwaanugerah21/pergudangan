# Rice Warehouse Management System

An internal warehouse management web application for managing and monitoring rice inventory data accurately and efficiently.

## Features

### 1. Dashboard
- Total stock overview (in kg/ton)
- Total incoming rice (this month)
- Total outgoing rice (this month)
- Low stock warnings

### 2. Rice Master Data
- Manage rice types with CRUD operations
- Fields: Name, Category/Grade, Unit (kg/sack), Description

### 3. Stock Management
- View current stock per rice type
- Stock history tracking
- Automatic stock calculation based on incoming and outgoing transactions

### 4. Incoming Rice (Pemasukan Beras)
- Record incoming rice transactions
- Fields: Date, Rice Type, Quantity, Supplier, Notes

### 5. Outgoing Rice (Penjualan Beras)
- Record outgoing rice transactions
- Fields: Date, Rice Type, Quantity, Destination/Customer, Notes
- Stock validation (prevents outgoing more than available stock)

### 6. Reports
- Filter by date range
- Filter by transaction type (incoming/outgoing)
- Export to CSV/Excel

## Tech Stack

### Frontend
- React 19 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls

### Backend
- Node.js with Express
- PostgreSQL database
- Prisma ORM
- JWT authentication
- bcryptjs for password hashing

## Prerequisites

- Node.js (v18 or higher)
- pnpm (or npm/yarn)
- PostgreSQL database

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE pergudangan;
```

2. Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/pergudangan?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
PORT=3001
```

3. Generate Prisma Client:
```bash
pnpm db:generate
```

4. Run database migrations:
```bash
pnpm db:migrate
```

5. Seed the database with sample data:
```bash
pnpm db:seed
```

### 3. Environment Variables

Create a `.env` file in the root directory (see `.env.example` for reference):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pergudangan?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
PORT=3001
```

For the frontend, create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Run the Application

#### Start the Backend Server

```bash
pnpm server:dev
```

The server will run on `http://localhost:3001`

#### Start the Frontend Development Server

In a separate terminal:

```bash
pnpm dev
```

The frontend will run on `http://localhost:5173`

### 5. Login Credentials

After seeding the database, you can login with:

- **Email**: `admin@warehouse.com`
- **Password**: `admin123`

## Project Structure

```
pergudangan/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.js            # Seed data script
├── server/
│   ├── index.js           # Express server entry point
│   ├── middleware/
│   │   └── auth.js        # Authentication middleware
│   └── routes/
│       ├── auth.js        # Authentication routes
│       ├── dashboard.js   # Dashboard data routes
│       ├── incoming.js    # Incoming transactions routes
│       ├── outgoing.js    # Outgoing transactions routes
│       ├── riceTypes.js   # Rice types CRUD routes
│       ├── reports.js     # Reports routes
│       └── stock.js       # Stock management routes
├── src/
│   ├── components/        # Reusable React components
│   ├── contexts/          # React contexts (Auth)
│   ├── pages/             # Page components
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main app component with routing
│   └── main.tsx           # Entry point
└── package.json
```

## Available Scripts

- `pnpm dev` - Start frontend development server
- `pnpm build` - Build frontend for production
- `pnpm server` - Start backend server
- `pnpm server:dev` - Start backend server with watch mode
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with sample data

## Database Schema

The application uses the following main models:

- **User** - Admin users for authentication
- **RiceType** - Master data for rice types
- **IncomingTransaction** - Records of incoming rice
- **OutgoingTransaction** - Records of outgoing rice
- **StockHistory** - Historical stock changes for tracking

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Rice Types
- `GET /api/rice-types` - Get all rice types
- `GET /api/rice-types/:id` - Get rice type by ID
- `POST /api/rice-types` - Create rice type
- `PUT /api/rice-types/:id` - Update rice type
- `DELETE /api/rice-types/:id` - Delete rice type

### Incoming Transactions
- `GET /api/incoming` - Get all incoming transactions
- `GET /api/incoming/:id` - Get transaction by ID
- `POST /api/incoming` - Create incoming transaction
- `PUT /api/incoming/:id` - Update transaction
- `DELETE /api/incoming/:id` - Delete transaction

### Outgoing Transactions
- `GET /api/outgoing` - Get all outgoing transactions
- `GET /api/outgoing/:id` - Get transaction by ID
- `POST /api/outgoing` - Create outgoing transaction
- `PUT /api/outgoing/:id` - Update transaction
- `DELETE /api/outgoing/:id` - Delete transaction

### Stock Management
- `GET /api/stock/current` - Get current stock for all rice types
- `GET /api/stock/history` - Get all stock history
- `GET /api/stock/history/:riceTypeId` - Get stock history for specific rice type

### Dashboard
- `GET /api/dashboard` - Get dashboard metrics

### Reports
- `GET /api/reports` - Get reports with optional filters (startDate, endDate, type)

All API endpoints (except `/api/auth/login`) require authentication via JWT token in the Authorization header.

## Development Notes

- The application uses JWT tokens for authentication
- Stock is automatically calculated from stock history
- Outgoing transactions validate stock availability before allowing the transaction
- All dates are stored in UTC and displayed in local timezone

## License

Private - Internal use only
# pergudangan
# pergudangan
