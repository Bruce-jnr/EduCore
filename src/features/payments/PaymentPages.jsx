import {useEffect,useState} from 'react';
import {api} from '../../services/api.js';
import {teacherApi,TEACHER_TOKEN_KEY} from '../teachers/teacher-api.js';
import {openCheckout,clearPaymentReturn} from './checkout.js';
import '../pricing/pricing.css';
function Frame({children}){return <main className="pricing-page"><section className="pricing-hero"><a href="#/">EduPalGh</a><h1>Secure payments</h1></section><section className="card" style={{maxWidth:640,margin:'24px auto',padding:24}}>{children}</section></main>;}
export function PaymentReturnPage(){
 const params=new URLSearchParams(window.location.search),reference=params.get('paystack_reference'),lesson=params.get('payment_kind')==='lesson';
 const [payment,setPayment]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const signedIn=Boolean(localStorage.getItem(lesson?TEACHER_TOKEN_KEY:'edupalgh_token'));
 async function verify(){setBusy(true);setError('');try{setPayment(await (lesson?teacherApi:api)(lesson?'/billing/paystack/verify':'/payments/paystack/school/verify',{method:'POST',body:JSON.stringify({reference})}));}catch(problem){setError(problem.message);}finally{setBusy(false);}}
 useEffect(()=>{if(signedIn&&reference){let active=true;(lesson?teacherApi:api)(lesson?'/billing/paystack/verify':'/payments/paystack/school/verify',{method:'POST',body:JSON.stringify({reference})}).then(value=>{if(active)setPayment(value);}).catch(problem=>{if(active)setError(problem.message);});return()=>{active=false;};}},[signedIn,reference,lesson]);
 const messages={FULFILLED:lesson?'Payment verified. This booklet is unlocked.':'Payment verified. Your school subscription is active.',REVIEW:'Your payment requires administrator review. Do not pay again. Contact support with the reference below.',FAILED:'Payment was not completed. Return to billing to try again.',PENDING:'Payment confirmation is pending. Check again before starting another payment.',INITIALIZING:'Checkout is still being prepared.'};
 return <Frame><h2>Payment status</h2><p role="status">{payment?messages[payment.status]:'We verify your payment with Paystack before granting access.'}</p>{reference&&<p style={{overflowWrap:'anywhere'}}>Reference: {reference}</p>}{error&&<p role="alert">{error}</p>}{!signedIn?<a href={lesson?'#/teacher/login':'#/login'}>Sign in to verify this payment</a>:<button className="primary-button" disabled={busy||!reference} onClick={verify}>{busy?'Checking…':'Check payment status'}</button>} <button className="secondary-button" onClick={()=>clearPaymentReturn(lesson?'/teacher/lesson-plans':'/school-billing')}>Return to {lesson?'lesson plans':'school billing'}</button></Frame>;
}
export function SchoolBillingPage(){
 const [quote,setQuote]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[key]=useState(()=>crypto.randomUUID());
 useEffect(()=>{api('/payments/paystack/school/quote').then(setQuote).catch(problem=>setError(problem.message));},[]);
 async function pay(){setBusy(true);setError('');try{openCheckout(await api('/payments/paystack/school/initialize',{method:'POST',body:JSON.stringify({idempotencyKey:key})}));}catch(problem){setError(problem.message);}finally{setBusy(false);}}
 return <Frame><h2>School subscription</h2>{error&&<p role="alert">{error}</p>}{quote&&<><p>{quote.plan} · {quote.billingCycle} · {quote.subscriptionStatus}</p>{quote.subscriptionEndsAt&&<p>Current period ends {new Date(quote.subscriptionEndsAt).toLocaleDateString()}.</p>}<p>GH₵{Number(quote.amount).toFixed(2)} per billing period. Payments are one-time; automatic renewal is not enabled.</p>{quote.enabled&&quote.canPay?<button className="primary-button" disabled={busy} onClick={pay}>{busy?'Preparing checkout…':`Pay with Paystack${quote.mode==='TEST'?' (test mode)':''}`}</button>:<p>{quote.canPay?'Online checkout is not configured. Contact your administrator.':'Request a paid plan and wait for administrator approval before paying.'}</p>}</>}<p><a href="#/pricing">View plans</a> · <a href="#/dashboard">School dashboard</a></p></Frame>;
}
