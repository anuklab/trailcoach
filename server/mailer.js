// Envío de correo (recuperación de contraseña, y lo que haga falta en el futuro). Usa SMTP si
// está configurado en el entorno (nodemailer); si no, no rompe nada — deja el mensaje en el log
// del servidor para poder probar el flujo en local, pero eso NO llega al usuario real, así que
// SMTP_* es obligatorio antes de tener usuarios de verdad (ver README).
import { log as changelog } from './db.js';

let transporter = null;
let triedInit = false;

async function getTransporter() {
  if (triedInit) return transporter;
  triedInit = true;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  try {
    const nodemailer = await import('nodemailer');
    transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  } catch (e) {
    console.error('[TrailCoach] No se pudo inicializar el envío de correo (¿falta instalar nodemailer?):', e.message);
    transporter = null;
  }
  return transporter;
}

export function mailConfigured() {
  return !!process.env.SMTP_HOST;
}

// Devuelve { sent: boolean } — si sent=false, el mensaje solo quedó en el log del servidor.
export async function sendMail({ to, subject, text }) {
  const t = await getTransporter();
  if (!t) {
    console.warn(`[TrailCoach] SMTP no configurado: correo NO enviado a ${to}. Asunto: "${subject}". Cuerpo:\n${text}`);
    return { sent: false };
  }
  try {
    await t.sendMail({ from: process.env.SMTP_FROM || SMTP_USER_FALLBACK(), to, subject, text });
    return { sent: true };
  } catch (e) {
    console.error('[TrailCoach] Error enviando correo:', e.message);
    changelog(null, 'mail', `Fallo enviando correo a ${to}: ${e.message}`);
    return { sent: false };
  }
}
function SMTP_USER_FALLBACK() { return process.env.SMTP_USER || 'no-reply@trailcoach.local'; }
