# EduCore

EduCore is a multi-tenant school management SaaS. This repository uses React and Vite for the frontend and Node.js, Express, Prisma, and MySQL for the API. All source code is JavaScript using ES modules.

## Current MVP scope

The current foundation includes the Stitch HTML references, an Express API shell, tenant-aware authentication, RBAC middleware, audit logging, and the initial Prisma models for schools, users, academics, staff, and students. Admissions is intentionally excluded for now.

## Requirements

- Node.js 20 or later
- MySQL 8

## Setup

1. Run `npm install`.
2. Copy `.env.example` values into your local `.env` and update them.
3. Set `DATABASE_URL` in Prisma's MySQL connection format.
4. Run `npm run prisma:generate`.
5. Run `npm run prisma:migrate -- --name initial_mvp`.
6. Start the API with `npm run dev:api`.
7. Start React with `npm run dev` in another terminal.

The frontend runs at `http://localhost:5173` and the API defaults to `http://localhost:4000`. Test the API with `GET /api/health`.

## Environment

Do not commit `.env`. Prisma requires a value like:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/educore"
```

`JWT_SECRET` must be at least 32 characters. Existing provider credentials should stay only in `.env` and must never be logged or committed.

## Structure

```text
prisma/                 Prisma schema and migrations
server/config/          Environment and database clients
server/middleware/      Authentication, tenant, validation, and error middleware
server/modules/         Domain routes, controllers, services, and repositories
server/services/        Shared domain services
src/                    React application
view/                   Google Stitch HTML references
```

## Tenant-security rule

Tenant-owned records must always be queried with the authenticated `tenantId`. The frontend must never decide or override tenant access. Cross-tenant isolation tests are required before later modules are started.
