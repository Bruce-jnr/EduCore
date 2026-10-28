import {env} from '../../config/env.js';
import {prisma} from '../../config/prisma.js';
import {createPaystackClient} from './paystack-client.js';
import {createPaystackService} from './paystack.service.js';
const apiOrigin=env.PUBLIC_API_URL || (env.NODE_ENV==='production'?'':`http://localhost:${env.PORT}`);
export const paystackClient=createPaystackClient({secret:env.PAYSTACK_SECRET_KEY});
export const paystackService=createPaystackService({db:prisma,client:paystackClient,callbackUrl:apiOrigin?`${apiOrigin.replace(/\/$/,'')}/api/payments/paystack/callback`:null});
