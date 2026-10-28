# Paystack checkout

Teacher booklet exports and approved school subscriptions use hosted Paystack checkout (GHS, cards and mobile money). Prices come from the server. Each checkout has a unique reference and request UUID, and one active checkout per purchase/school. Existing manual payment review remains available.

Configure PAYSTACK_SECRET_KEY (or the existing PAYSTACK_LIVE_SECRET_KEY / PAYSTACK_TEST_SECRET_KEY alias). Hosted checkout does not require a public key in the browser. Never commit credentials. Configure PUBLIC_API_URL to the externally reachable HTTPS API origin and CLIENT_URL to the frontend origin. Production checkout requires PUBLIC_API_URL. Localhost callbacks work only in the initiating browser; Paystack cannot deliver webhooks to localhost.

Set the Paystack dashboard webhook URL to https://YOUR_API/api/payments/paystack/webhook. HMAC-SHA512 validates the exact raw body before processing. The server independently verifies successful transactions and matches reference, amount, currency, mode, email and saved metadata. Redirects alone never grant access. Provider network calls run outside database transactions. Fulfilment locks the owner then payment row; receipt, entitlement, audit and fulfilled status commit together. Repeated verification/webhooks are idempotent. Changed plan terms or conflicting manual receipts enter REVIEW. Administrators can list /api/platform/paystack-payments and POST /api/platform/paystack-payments/reconcile with {reference} using platform permissions. Review failures require investigation, not another charge.

Apply the included Prisma migration and regenerate the client before use. The migration creates a checkout table and unique constraints; it does not alter existing purchases. Production requires InnoDB transactional tables. No automatic subscription debits, refunds, disputes, reversals or reconciliation scheduler are implemented. Staff must review reversals and unresolved payments in Paystack. Manual approval during an active checkout can cause a collected payment to require reconciliation; do not approve both independently. Test with Paystack test credentials before enabling live collections.

Official API: https://paystack.com/docs/api/transaction/
Verification: https://paystack.com/docs/payments/verify-payments/
Webhooks: https://paystack.com/docs/payments/webhooks/
