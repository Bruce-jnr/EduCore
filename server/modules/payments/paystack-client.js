import {createHmac,timingSafeEqual} from 'node:crypto';
import {AppError} from '../../errors/app-error.js';
export const paystackMode=key=>key?.startsWith('sk_live_')?'LIVE':key?.startsWith('sk_test_')?'TEST':null;
export function validPaystackSignature(raw,signature,secret) {
 if(!secret||!Buffer.isBuffer(raw)||typeof signature!=='string'||!/^[a-f0-9]{128}$/i.test(signature))return false;
 return timingSafeEqual(createHmac('sha512',secret).update(raw).digest(),Buffer.from(signature,'hex'));
}
export function toMinor(amount) {const value=Math.round(Number(amount)*100);if(!Number.isSafeInteger(value)||value<=0||Math.abs(Number(amount)*100-value)>.00001)throw new AppError('Invalid payment amount.',422,'INVALID_PAYMENT_AMOUNT');return value;}
export function validCheckoutUrl(value) {try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='checkout.paystack.com'&&!url.username&&!url.password&&!url.port;}catch{return false;}}
export function createPaystackClient({secret,fetchImpl=fetch}) {
 const mode=paystackMode(secret);
 async function call(path,body) {
  if(!mode)throw new AppError('Paystack checkout is not configured.',503,'PAYSTACK_NOT_CONFIGURED');
  try {
   const response=await fetchImpl(`https://api.paystack.co${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
   const payload=await response.json();if(!response.ok||payload.status!==true||!payload.data)throw new Error('provider');return payload.data;
  }catch{throw new AppError('Paystack is unavailable. Please retry or check the payment status before paying again.',503,'PAYSTACK_UNAVAILABLE');}
 }
 return {mode,async initialize(input){const data=await call('/transaction/initialize',{email:input.email,amount:String(input.amountMinor),currency:'GHS',reference:input.reference,callback_url:input.callbackUrl,channels:['card','mobile_money'],metadata:JSON.stringify({application:'edupalgh',paymentId:input.id,purpose:input.purpose})});if(data.reference!==input.reference||!validCheckoutUrl(data.authorization_url))throw new AppError('Paystack returned an invalid checkout session.',502,'INVALID_CHECKOUT_RESPONSE');return {authorizationUrl:data.authorization_url};},verify:reference=>call(`/transaction/verify/${encodeURIComponent(reference)}`)};
}
