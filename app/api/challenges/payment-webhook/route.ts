import { NextResponse } from 'next/server';
import { activateCapturedPayment, validPaymentSignature } from '@/lib/challenge-payments';

export async function POST(request: Request) {
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
  if(!secret) return NextResponse.json({error:'Webhook is not configured'},{status:503});
  const raw=await request.text();
  if(raw.length>100000 || !validPaymentSignature(raw,request.headers.get('x-razorpay-signature') ?? '',secret)) return NextResponse.json({error:'Invalid webhook signature'},{status:401});
  try {
    const event=JSON.parse(raw);
    if(event.event==='payment.captured') {
      const payment=event.payload?.payment?.entity;
      // Fetch the trusted order to isolate this product from other payments on the account.
      const {razorpay}=await import('@/lib/challenge-payments');
      const order=await razorpay(`orders/${encodeURIComponent(payment.order_id)}`);
      if(order.notes?.product==='challenge_pass_v1') await activateCapturedPayment(payment.id);
    }
    return NextResponse.json({received:true});
  } catch { return NextResponse.json({error:'Pass activation pending; retry delivery'},{status:500}); }
}
