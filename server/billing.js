// Suscripción de pago con Stripe. Usa Stripe Checkout (página alojada por Stripe) y el Customer
// Portal (también alojado por Stripe) para gestionar/cancelar — así nunca tocamos ni vemos datos
// de tarjeta, y el cumplimiento PCI lo lleva Stripe, no nosotros.
import Stripe from 'stripe';
import { setStripeCustomer, setSubscription, getUserByStripeCustomer } from './db.js';

const TRIAL_DAYS = 14;

let stripe = null;
function client() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export function billingConfigured() { return !!client() && !!process.env.STRIPE_PRICE_MONTHLY; }

const PRICE_IDS = () => ({
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
});

// Crea una sesión de Stripe Checkout en modo suscripción. Si el usuario está todavía dentro de
// su periodo de prueba gratuita, Stripe no le cobra hasta que termine (trial_period_days) —
// así puede meter la tarjeta antes sin que le cobren de más.
export async function createCheckoutSession(user, plan, baseUrl) {
  const s = client();
  if (!s) throw new Error('Stripe no está configurado en el servidor.');
  const priceId = PRICE_IDS()[plan];
  if (!priceId) throw new Error('Plan no válido.');

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await s.customers.create({ email: user.email, metadata: { user_id: String(user.id) } });
    customerId = customer.id;
    setStripeCustomer(user.id, customerId);
  }

  const trialActive = user.subscription_status === 'trialing' && user.trial_ends_at && user.trial_ends_at > new Date().toISOString();
  const trialDaysLeft = trialActive ? Math.max(1, Math.ceil((new Date(user.trial_ends_at) - Date.now()) / 86400000)) : 0;

  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: trialDaysLeft ? { trial_period_days: trialDaysLeft } : undefined,
    success_url: `${baseUrl}/?billing=ok`,
    cancel_url: `${baseUrl}/?billing=cancelled`,
    managed_payments: { enabled: false },
  });
  return session.url;
}

// Portal de Stripe: cambiar de plan, actualizar tarjeta, cancelar — todo alojado por Stripe.
export async function createPortalSession(user, baseUrl) {
  const s = client();
  if (!s) throw new Error('Stripe no está configurado en el servidor.');
  if (!user.stripe_customer_id) throw new Error('Todavía no tienes una suscripción que gestionar.');
  const session = await s.billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${baseUrl}/` });
  return session.url;
}

function planFromPriceId(priceId) {
  const ids = PRICE_IDS();
  if (priceId === ids.monthly) return 'monthly';
  if (priceId === ids.yearly) return 'yearly';
  return null;
}

// Procesa los eventos del webhook de Stripe y mantiene el estado de suscripción del usuario al
// día. Verificamos la firma para asegurarnos de que el evento viene de verdad de Stripe.
export async function handleWebhookEvent(rawBody, signature) {
  const s = client();
  if (!s) throw new Error('Stripe no está configurado en el servidor.');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Falta STRIPE_WEBHOOK_SECRET en el servidor.');
  const event = s.webhooks.constructEvent(rawBody, signature, secret);

  const sub = event.data.object;
  if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    const user = getUserByStripeCustomer(sub.customer);
    if (user) {
      const priceId = sub.items?.data?.[0]?.price?.id;
      setSubscription(user.id, { subscriptionId: sub.id, status: sub.status, plan: planFromPriceId(priceId) });
    }
  }
  return { type: event.type };
}
