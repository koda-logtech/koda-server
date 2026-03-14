import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import loggerMiddleware from './middlewares/logger';
import router from './routes';

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(loggerMiddleware);
app.use(router);
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date(),
    environment: NODE_ENV,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT} em modo ${NODE_ENV}`);
});

export default app;
