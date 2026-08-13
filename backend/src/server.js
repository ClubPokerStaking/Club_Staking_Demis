import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRoutes } from './routes/authRoutes.js';
import { publicRoutes } from './routes/publicRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { telegramRoutes } from './routes/telegramRoutes.js';
import { startPaymentPoller } from './services/poller.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram', telegramRoutes);

app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
  startPaymentPoller();
});
