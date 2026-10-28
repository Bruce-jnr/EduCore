# EduPalGh

EduPalGh is a multi-tenant school-management SaaS for basic schools from kindergarten through JHS. Each school operates as an isolated tenant with its own users, students, academics, attendance, results, finances, branding, settings, notifications, and audit history.

The project uses JavaScript only—no TypeScript—and all Node.js code uses ES modules.

## Technology stack

- React 19 and Vite
- Node.js and Express 5
- Prisma ORM and MySQL 8
- Zod request validation
- JWT authentication and bcrypt password hashing
- Responsive custom CSS based on the Google Stitch references in `view/`

## Implemented functionality

### Platform Super Admin

- Separate platform login at `#/platform/login`
- School provisioning, activation, and suspension
- Kindergarten-to-JHS academic templates
- Configurable platform identity, trial duration, and tenant defaults
- Platform analytics and cross-tenant audit-log search
- Automatic subscription end date for newly provisioned schools

Default academic templates:

- Basic School: KG 1–2, Primary 1–6, and JHS 1–3

All tenants use term, class, and subject terminology with levels from KG 1 through JHS 3.

### Tenant administration

- Tenant login and permission-based RBAC
- Users, custom roles, and staff-linked accounts
- Staff profiles and teacher assignments
- School profile and regional settings
- Central school-logo upload and primary/secondary branding colors
- Light and dark application themes with saved preference
- Academic years, terms, classes, and subjects
- Student records, profiles, guardians, and historical enrollments
- Tenant dashboard and audit logging

The report-card letterhead inherits the school logo and colors configured in **School Settings → Branding**.

### Attendance

- Class attendance rosters
- Present, absent, late, and excused statuses
- Mark-all actions and individual remarks
- Attendance history, summaries, and percentages
- Form-teacher assignment enforcement

Each class and academic period has one form teacher. That teacher records class attendance; administrators oversee attendance statistics across the school.

### Results and report cards

- Configurable assessment schemes and weighted components
- Validation that assessment weights total 100%
- Configurable grading schemes and boundaries
- Form-teacher score entry across every subject in the assigned class
- Draft, submit, reject, and approve-to-publish workflow
- Rejection reasons and workflow audit logs
- Administrator-approved results available to the assigned form teacher for report-card preparation and printing
- School-specific letterhead, logo, colors, and contact information
- Attendance summaries and printable report cards

```text
Teacher enters scores
        ↓
Teacher saves a draft
        ↓
Teacher submits the completed sheet
        ↓
Academic Administrator reviews
        ↓
Reject for correction or approve
        ↓
Authorized administrator publishes
        ↓
Report cards become available
```

### Year-end progression

- Source academic-year and class roster selection
- Individual or bulk student selection
- Promote, repeat, transfer, withdraw, and graduate outcomes
- Destination-year and class validation
- Promotion must move to a higher level
- Repeat must remain at the same level
- Previous enrollment is closed rather than overwritten
- Promotion and repeat create a new historical enrollment
- Duplicate and stale-roster protection
- Transactional processing, run history, student-level records, and audit logs

The workflow is available at `#/academics/progression` to users with `academics.update` permission.

### Finance

- Fee categories and fee structures
- Individual student bills
- Bulk billing for the entire school, a class, or a level
- Duplicate bulk-billing protection
- Invoice items, partial payments, and full payments
- Automatic payment allocation
- Tenant-unique invoice and receipt identifiers
- Accountant activity notifications for administrative review
- Finance audit logging

### Student financial ledger

Each student has a calculated transaction ledger containing:

- Charges from non-void invoices
- Completed payments
- Discounts
- Scholarships
- Refunds
- Credit adjustments
- Debit adjustments
- Running balance after every transaction

The ledger displays total charges, payments, discounts, scholarships, refunds, and outstanding balance. Adjustments are immutable; incorrect adjustments must be reversed with a required reason. Credits cannot exceed the outstanding balance, and refunds cannot exceed net completed payments.

Open a student profile and select **Open student ledger**, or navigate to `#/finance/ledger/STUDENT_ID`.

### Notifications

- Unread counter and notification dropdown in the tenant top bar
- Teacher result-submission alerts for academic approvers
- Result approval and rejection alerts for teachers
- Accountant fee-structure and bulk-billing alerts for administrators
- Subscription-expiry warnings at 14, 7, 3, and 1 day remaining
- Direct workflow links
- Mark-one and mark-all-as-read actions
- Persistent, tenant-isolated notification history
- Automatic refresh every 60 seconds

## Default roles

The development seed configures:

- School Administrator
- Academic Administrator
- Teacher
- Accountant
- Platform Super Admin

Authorization is permission-based rather than determined only by role names. The API remains authoritative even when the UI hides unavailable actions.

Teacher accounts must be linked to staff profiles. Teacher assignments connect staff to an academic year, period, class, and subject. Attendance and result APIs enforce those assignments.

## Requirements

- Node.js 20 or newer
- npm
- MySQL 8

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and replace the placeholders.

3. Create the MySQL database referenced by `DATABASE_URL`.

4. Generate Prisma Client:

   ```bash
   npm run prisma:generate
   ```

5. Apply committed migrations:

   ```bash
   npx prisma migrate deploy
   ```

6. Seed development roles and administrator accounts:

   ```bash
   npm run prisma:seed
   ```

7. Start the frontend and API:

   ```bash
   npm run dev:all
   ```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:8080` by default. The health endpoint is `GET http://localhost:8080/api/health`.

## Environment variables

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/edupalgh"
PORT=8080
CLIENT_URL="http://localhost:5173"

JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="15m"

UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="2MB"

SEED_ADMIN_EMAIL="admin@demo.edupalgh.local"
SEED_ADMIN_PASSWORD="replace-with-a-development-password"

PLATFORM_ADMIN_EMAIL="platform@edupalgh.local"
PLATFORM_ADMIN_PASSWORD="replace-with-a-platform-development-password"
```

If a MySQL password contains reserved URL characters such as `@`, `#`, `/`, or `:`, percent-encode them in `DATABASE_URL`.

Never commit `.env`, passwords, JWT secrets, database credentials, or provider keys.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite frontend |
| `npm run dev:api` | Start Express with Nodemon |
| `npm run dev:all` | Start frontend and API together |
| `npm run start:api` | Start the API without Nodemon |
| `npm run build` | Create a production frontend build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run security:tenant` | Verify automatic tenant read/write isolation |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate -- --name NAME` | Create a development migration |
| `npx prisma migrate deploy` | Apply committed migrations |
| `npm run prisma:seed` | Seed development data and roles |
| `npm run prisma:studio` | Open Prisma Studio |

## Project structure

```text
prisma/
  migrations/             Versioned MySQL migrations
  schema.prisma           Prisma data model
  seed.js                 Development tenant, roles, and users

scripts/
  check-tenant-security.js

server/
  config/                 Environment and Prisma configuration
  errors/                 Application error types
  middleware/             Authentication, tenancy, RBAC, and validation
  modules/                Domain routes, services, and validation
  security/               Request-level tenant context
  services/               Auditing and notification services
  app.js                   Express application
  index.js                 API entry point

src/
  components/             Shared tenant UI components
  features/               React feature modules
  services/               Frontend API client
  App.jsx                  Hash routing and application composition

view/                      Original Google Stitch HTML references
```

## Architecture and tenant security

EduPalGh is a modular monolith using a shared MySQL database with tenant-aware tables. Tenant identity comes from the authenticated user—not from a tenant ID supplied by the frontend.

```text
Authentication
    ↓
Tenant resolution and active-status validation
    ↓
Request-level tenant security context
    ↓
Permission and assignment validation
    ↓
Tenant-scoped Prisma operation
```

Defense-in-depth protections include:

- Explicit `tenantId` predicates throughout tenant services
- Async request-level tenant context
- Automatic Prisma scoping for tenant-owned models
- Foreign tenant predicates overridden by the authenticated context
- Cross-tenant creates, updates, and upserts rejected
- Separate platform users and platform-only permission middleware
- Teacher assignment validation for attendance and results
- Tenant-scoped notifications, finance, progression, and audit records
- Repeatable tenant-isolation verification through `npm run security:tenant`

Submitted results cannot be silently edited, published report cards only use published results, financial adjustments are reversed rather than deleted, and historical enrollments are preserved.

## Database migrations

The repository currently contains 14 migrations:

1. Initial multi-tenant MVP
2. Teacher assignments
3. Attendance
4. Finance core
5. Platform settings
6. Results core
7. User-to-staff links
8. Bulk billing
9. Result workflow metadata
10. Guardians
11. Report-card letterhead and branding
12. Notifications and subscription expiry
13. Year-end progression
14. Student financial ledger

Use Prisma migrations for schema changes. Do not manually modify deployed database tables.

## Current limitations and next work

- Report-card remarks use printable signature and remark lines rather than persisted teacher/head-teacher remark records.
- PDF output currently uses the browser print workflow; dedicated server-generated PDFs are not implemented.
- Admissions remains intentionally excluded for now.
- Password reset, invitations, refresh-token rotation, MFA, and login-history management remain future work.
- Notifications are currently in-app; email, SMS, push delivery, and WebSocket delivery are not implemented.
- Local uploads should be replaced with S3-compatible object storage for production.
- Payment-provider integrations and payment reversals/refunds against an external provider are not implemented.
- Automated result, finance, progression, and browser end-to-end tests should be expanded before production deployment.

## Production checklist

- Store credentials in a managed secret service.
- Run `npx prisma migrate deploy` during deployment.
- Run `npm run security:tenant`, lint, tests, and the production build as release gates.
- Serve the frontend and API over HTTPS.
- Restrict CORS to trusted frontend origins.
- Configure MySQL backups and regularly test restoration.
- Add rate limiting, refresh-token rotation, password-reset delivery, monitoring, and structured logs.
- Replace local uploads with S3-compatible storage.
- Add a background-job system for bulk email, SMS, reports, and long-running finance operations.


## Teacher lesson-plan service

The Lesson Plans workspace provides teacher-authored 12-week editable templates, a term scheme, a school review library, revision conflict protection and a printable booklet. It uses existing classes/subjects/terms and has no paid AI dependency. Curriculum content is supplied by teachers.

See [lesson-plan service documentation](docs/lesson-plan-service.md) for the API, permissions, migration activation, reference observations and limitations. Run `npm run test:lesson-plans` for the database-free unit suite. Apply the additive migration and refresh sign-in before using the module.
