import { createHmac, timingSafeEqual } from 'node:crypto';
import { createCronClient } from '@/lib/supabase/cron';

export const PASS_AMOUNT = 19900;
export function paymentReady() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
export function validPaymentSignature(text: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected=createHmac('sha256',secret).update(text).digest();
  return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
export async function razorpay(path: string, body?: unknown) {
  const response=await fetch(`https://api.razorpay.com/v1/${path}`,{method:body?'POST':'GET',
    headers:{Authorization:`Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error('Payment provider could not confirm this request. Please retry.');
  return response.json();
}
export async function activateCapturedPayment(paymentId: string, expectedUser?: string) {
  if(!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new Error('Invalid payment');
  const payment=await razorpay(`payments/${paymentId}`);
  if(payment.status!=='captured' || payment.amount!==PASS_AMOUNT || payment.currency!=='INR' || payment.refunded || payment.amount_refunded>0) throw new Error('Payment has not been captured. Refresh shortly to retry verification.');
  const order=await razorpay(`orders/${payment.order_id}`);
  const user=order.notes?.user_id;
  if(order.notes?.product!=='challenge_pass_v1' || order.amount!==PASS_AMOUNT || order.currency!=='INR' ||
    typeof user!=='string' || !/^[a-f0-9-]{36}$/i.test(user) || (expectedUser && user!==expectedUser)) throw new Error('This payment does not belong to this account or pass.');
  const {error}=await createCronClient().rpc('challenge_activate_pass',{p_user:user,p_payment:paymentId});
  if(error) throw new Error('Payment received. Pass activation is pending; retry verification shortly.');
}
