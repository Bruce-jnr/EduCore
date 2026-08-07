import { AsyncLocalStorage } from 'node:async_hooks';

export const tenantContext = new AsyncLocalStorage();
export const currentTenantId = () => tenantContext.getStore()?.tenantId || null;
