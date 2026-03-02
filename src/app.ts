import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db';

// Route imports
import authRoutes from './routes/auth.routes';
import messRoutes from './routes/mess.routes';
import memberRoutes from './routes/member.routes';
import depositRoutes from './routes/deposit.routes';
import mealRoutes from './routes/meal.routes';
import expenseRoutes from './routes/expense.routes';
import reportRoutes from './routes/report.routes';
import settingsRoutes from './routes/settings.routes';

const app: Application = express();

// Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Mess Management API is running...' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/messes', messRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/deposits', depositRoutes);
app.use('/api/v1/meals', mealRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
