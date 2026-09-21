import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import loggerMiddleware from './middlewares/logger';
import router from './routes';
import { seedAdminUser } from './modules/users/users.service';

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const rawCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawCorsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(loggerMiddleware);
// Prefixo /api alinhado a VITE_API_URL (padrão http://localhost:3000/api)
app.use('/api', router);

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date(),
    environment: NODE_ENV,
  });
});

const startServer = async () => {
  try {
    await seedAdminUser();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Startup] Erro ao executar seed do admin:', error);
  }

  app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Servidor rodando em http://0.0.0.0:${PORT} em modo ${NODE_ENV}`);
  });
};

startServer();

export default app;
