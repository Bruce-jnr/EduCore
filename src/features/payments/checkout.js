export function openCheckout(payment) {
 if (!payment.authorizationUrl) throw new Error('Checkout is being prepared. Please try again shortly using the same payment button.');
 const url=new URL(payment.authorizationUrl);
 if(url.protocol!=='https:'||url.hostname!=='checkout.paystack.com'||url.username||url.password||url.port)throw new Error('Invalid checkout address. Contact support.');
 window.location.assign(url.href);
}
export function clearPaymentReturn(hash) { const url=new URL(window.location.href);url.searchParams.delete('paystack_reference');url.searchParams.delete('payment_kind');url.hash=hash;window.location.replace(url.href); }
