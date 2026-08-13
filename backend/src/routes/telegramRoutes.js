import { Router } from 'express';
import { prisma } from '../prismaClient.js';
import { sendTelegramMessage, purchaseSummaryText } from '../services/notify.js';
import { asyncRoute } from '../httpError.js';

export const telegramRoutes = Router();

// Webhook público de Telegram — Telegram nos manda acá cada mensaje que
// le llega al bot. Solo nos interesa "/start <purchaseId>", que es el
// deep link que mostramos en la pantalla de pago para conectar el chat.
telegramRoutes.post('/webhook', asyncRoute(async (req, res) => {
  const msg = req.body?.message;
  const text = String(msg?.text || '').trim();
  const chatId = msg?.chat?.id;

  if (chatId && text.startsWith('/start')) {
    const purchaseId = text.split(/\s+/)[1];
    const purchase = purchaseId
      ? await prisma.purchase.findUnique({ where: { id: purchaseId }, include: { tournament: true, package: true } })
      : null;

    if (purchase) {
      await prisma.purchase.update({ where: { id: purchase.id }, data: { telegramChatId: String(chatId) } });
      const productName = purchase.package?.name || purchase.tournament?.name;
      await sendTelegramMessage(chatId, `¡Conectado! Te vamos a avisar acá cuando se confirme tu pago.\n\n${purchaseSummaryText(purchase, productName)}`);
    } else {
      await sendTelegramMessage(chatId, 'No encontramos esa compra. Abrí el link desde tu pantalla de pago para conectar el chat correcto.');
    }
  }

  // Telegram solo necesita un 200 rápido, no le importa el cuerpo.
  res.json({ ok: true });
}));
