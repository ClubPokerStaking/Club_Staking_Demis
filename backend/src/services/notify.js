import nodemailer from 'nodemailer';

// Todos los canales son opcionales: si las credenciales no están
// configuradas en las variables de entorno, la función correspondiente
// simplemente no hace nada (nunca rompe el flujo de compra).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    // Algunos proveedores (Render incluido) no tienen salida IPv6, y la
    // resolución DNS por defecto puede devolver la dirección IPv6 de
    // Gmail primero, causando ENETUNREACH. Forzamos IPv4.
    family: 4,
  });
  return transporter;
}

export function isEmailLike(contact) {
  return EMAIL_RE.test(String(contact || '').trim());
}

export function telegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME || null;
}

// Deep link: al tocarlo, Telegram abre el bot y le manda "/start <id>" —
// así identificamos a qué compra corresponde el chat que se abre.
export function telegramDeepLink(purchaseId) {
  const username = telegramBotUsername();
  if (!username) return null;
  return `https://t.me/${username}?start=${purchaseId}`;
}

async function sendEmail(to, subject, text) {
  const t = getTransporter();
  if (!t || !to) return false;
  try {
    await t.sendMail({ from: process.env.GMAIL_USER, to, subject, text });
    return true;
  } catch (err) {
    console.error('[notify] error enviando email:', err.message);
    return false;
  }
}

export async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[notify] error enviando telegram:', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[notify] error enviando telegram:', err.message);
    return false;
  }
}

function fmt(micro) {
  return (Number(micro) / 1_000_000).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function purchaseSummaryText(purchase, productName) {
  const lines = [
    `Código de compra: ${purchase.code}`,
    `${productName} · ${purchase.percent}% de acción`,
    '',
    `Monto exacto a enviar: ${fmt(purchase.uniqueAmountMicro)} USDT`,
    `Dirección: ${purchase.walletAddress}`,
    '',
    'Guardá el código para consultar el estado de tu compra más tarde.',
  ];
  return lines.join('\n');
}

// Se llama justo después de crear la compra — manda el código por el
// canal que corresponda si el comprador dejó un contacto usable.
export async function notifyNewPurchase(purchase, productName) {
  const text = purchaseSummaryText(purchase, productName);
  if (isEmailLike(purchase.buyerContact)) {
    await sendEmail(purchase.buyerContact.trim(), `Tu código de compra: ${purchase.code}`, text);
  }
  if (purchase.telegramChatId) {
    await sendTelegramMessage(purchase.telegramChatId, text);
  }
}

// Se llama cuando una compra pasa a "confirmado" (verificación on-chain o
// confirmación manual del organizador).
export async function notifyPurchaseConfirmed(purchase, productName) {
  const text = [
    `¡Tu pago para ${productName} fue confirmado! 🎉`,
    `Código de compra: ${purchase.code}`,
    `${purchase.percent}% de acción`,
  ].join('\n');
  if (isEmailLike(purchase.buyerContact)) {
    await sendEmail(purchase.buyerContact.trim(), `Pago confirmado — ${productName}`, text);
  }
  if (purchase.telegramChatId) {
    await sendTelegramMessage(purchase.telegramChatId, text);
  }
}
