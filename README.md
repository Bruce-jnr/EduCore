# EduCore

EduCore is a multi-tenant school management SaaS for primary schools, secondary schools, colleges, and combined institutions. Each school operates as an isolated tenant with its own users, academic records, students, attendance, results, finances, branding, settings, and audit history.

The project uses JavaScript only—no TypeScript—and all Node.js code uses ES modules.

## Technology stack

- React 19 and Vite
- Node.js and Express 5
- Prisma ORM
- MySQL 8
- Zod validation
- JWT authentication
- bcrypt password hashing
- Custom responsive CSS based on the Google Stitch references in `view/`

## Implemented functionality

### Platform Super Admin

- Separate platform login at `#/platform/login`
- Platform dashboard at `#/platform/schools`
- School tenant provisioning
- Tenant activation and suspension
- School-type academic templates
- Platform settings
- Cross-tenant system analytics
- Platform and tenant audit-log search

New schools receive these academic defaults:

- Primary: P1 through P6
- Secondary: S1, S2, and S3
- College: Level 100, 200, 300, and 400
- Combined: P1–P6, JHS 1–3, and S1–S3

College tenants also default to semester, level, and course terminology. Primary and secondary tenants default to term, class, and subject terminology.

### Tenant administration

- Tenant login and JWT authentication
- Role-based access control
- Users and custom roles
- Staff profiles linked to login accounts
- School profile, branding, and academic settings
- Academic years and terms/semesters
- Classes or levels and subjects or courses
- Staff and teacher assignments
- Student records, profiles, guardians, and enrollment history
- Tenant dashboard

### Attendance

- Class attendance rosters
- Present, absent, late, and excused statuses
- Mark-all actions and individual remarks
- Attendance history and percentages
- Teacher assignment enforcement

Teachers can only take attendance for classes assigned to their linked staff profile. Administrators with broader attendance permissions can oversee all classes.

### Results and report cards

- Configurable assessment schemes
- Assessment components and tenant-defined weights
- Validation that component weights total 100%
- Configurable grading schemes and boundaries
- Weighted score calculation on the server
- Assignment-restricted teacher score entry
- Draft result sheets
- Submit, reject, approve, and publish workflow
- Rejection reasons and workflow audit logs
- Published-results-only report cards
- Attendance summary on report cards
- Printable report-card view

Result workflow:

```text
Teacher enters scores
        ↓
Teacher saves draft
        ↓
Teacher submits completed sheet
        ↓
Academic Administrator reviews
        ↓
Reject for correction or approve
        ↓
Authorized administrator publishes
        ↓
Teacher or administrator prepares report cards
```

### Finance

- Fee categories
- Fee structures
- Individual student bills
- Bulk billing for all students, a class, or a level
- Duplicate bulk-billing protection
- Student invoices and invoice items
- Partial and full payments
- Automatic payment allocation
- Unique invoice and receipt identifiers
- Outstanding-balance calculations
- Finance audit logging

The Accountant role can manage fee structures, bills, bulk bills, and payments without receiving academic-administration permissions.

## Default roles

The development seed configures:

- School Administrator
- Academic Administrator
- Teacher
- Accountant
- Platform Super Admin

Authorization is permission-based rather than based only on role names. The server remains the authority even when the UI hides unavailable actions.

Teacher accounts must be linked to a staff profile. Teacher assignments connect that staff profile to an academic year, period, class, and subject. Attendance and result APIs use this relationship to enforce assignment access.

## Requirements

- Node.js 20 or newer
- npm
- MySQL 8

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and replace every placeholder.

3. Create the MySQL database named in `DATABASE_URL`.

4. Generate Prisma Client:

   ```bash
   npm run prisma:generate
   ```

5. Apply existing migrations:

   ```bash
   npx prisma migrate deploy
   ```

6. Seed development roles and administrator accounts:

   ```bash
   npm run prisma:seed
   ```

7. Start the frontend and API together:

   ```bash
   npm run dev:all
   ```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:8080` by default. Check the API with `GET http://localhost:8080/api/health`.

## Environment variables

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/educore"
PORT=8080
CLIENT_URL="http://localhost:5173"

JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="15m"

UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=2097152

SEED_ADMIN_EMAIL="admin@demo.educore.local"
SEED_ADMIN_PASSWORD="replace-with-a-development-password"

PLATFORM_ADMIN_EMAIL="platform@educore.local"
PLATFORM_ADMIN_PASSWORD="replace-with-a-platform-development-password"
```

`DATABASE_URL` is the connection value Prisma uses. If a MySQL password contains reserved URL characters such as `@`, `#`, `/`, or `:`, percent-encode those characters in `DATABASE_URL`.

Never commit `.env`, real passwords, JWT secrets, database credentials, or provider API keys.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite frontend |
| `npm run dev:api` | Start the Express API with Nodemon |
| `npm run dev:all` | Start frontend and API together |
| `npm run start:api` | Start the API without Nodemon |
| `npm run build` | Create a production frontend build |
| `npm run preview` | Preview the production frontend build |
| `npm run lint` | Run ESLint |
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

server/
  config/                 Environment and Prisma configuration
  errors/                 Application error types
  middleware/             Authentication, tenancy, RBAC, and validation
  modules/                Domain routes, services, and validation
  services/               Shared services such as auditing
  app.js                   Express application
  index.js                 API entry point

src/
  components/             Shared tenant UI components
  features/               React feature modules
  services/               Frontend API client
  App.jsx                  Hash routing and application composition

view/                      Original Google Stitch HTML references
```

## Architecture and security

EduCore is a modular monolith using a shared database with tenant-aware tables. Tenant identity comes from the authenticated user—not from a tenant ID supplied by the frontend.

The expected request flow is:

```text
Authentication
    ↓
Tenant resolution
    ↓
Tenant status validation
    ↓
Permission validation
    ↓
Assignment validation where required
    ↓
Tenant-scoped business operation
```

Security rules:

- Every tenant-owned query must include the authenticated `tenantId`.
- Platform users are separate from tenant users.
- Teachers require linked staff profiles for assignment-restricted work.
- Academic configuration requires explicit management permissions.
- Submitted result sheets cannot be silently edited.
- Only approved results can be published.
- Report cards use published results only.
- Financial and academic changes are audited.
- Important financial and academic history must not be permanently deleted.

## Database migrations

The repository currently contains migrations for:

1. Initial multi-tenant MVP
2. Teacher assignments
3. Attendance
4. Finance core
5. Platform settings
6. Results core
7. User-to-staff account links
8. Bulk billing
9. Result workflow metadata

Use Prisma migrations for schema changes. Do not manually modify deployed database tables.

## Current limitations and next work

- Report-card remarks are currently printable signature/remark lines rather than persisted remark records.
- PDF files use the browser print workflow; dedicated server-generated PDFs are not implemented yet.
- College departments, programmes, and persistent programme-level entities still need their full academic model.
- Admissions remains intentionally excluded for now.
- Password reset, invitations, refresh-token rotation, MFA, external file storage, notifications, and payment-provider integrations remain future work.
- Automated tenant-isolation, result-workflow, finance, and end-to-end test suites should be expanded before production deployment.

## Production notes

Before production deployment:

- Use a strong secret manager for credentials.
- Run `npx prisma migrate deploy` during deployment.
- Serve the API and frontend over HTTPS.
- Restrict CORS to the deployed frontend origin.
- Configure secure backup and restore procedures for MySQL.
- Add rate limiting, refresh-token rotation, password-reset delivery, monitoring, and structured logs.
- Replace local uploads with S3-compatible object storage.
- Run tenant-isolation and permission tests as release gates.
