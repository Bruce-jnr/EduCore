# EduPalGh Multi-Tenant School Management System

## Codex Application Build Instructions

Build a production-ready multi-tenant school management SaaS application called **EduPalGh**.

The application supports basic schools from kindergarten through JHS.

The application must allow multiple schools to use the same platform while keeping each school's users, students, academic records, finances, settings, and documents completely isolated.

Use the existing Google Stitch UI prototype as the visual reference. Match the prototype closely while maintaining clean, reusable, accessible frontend code.

---

# 1. CORE OBJECTIVE

Build EduPalGh as a secure multi-tenant SaaS school management platform.

Each school is a tenant.

Every tenant must have its own:

- School profile
- Branding
- Academic structure
- Students
- Staff
- Parents
- Admissions
- Attendance
- Subjects
- Classes from kindergarten through JHS
- Examinations
- Results
- Fees
- Payments
- Reports
- Users
- Roles
- Permissions
- Settings
- Audit logs

No tenant must ever be able to access another tenant's data.

Tenant isolation is a critical security requirement.

---

# 2. RECOMMENDED TECHNOLOGY STACK

Use the following stack unless the existing project already defines equivalent technologies.

## Frontend

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui or another consistent component library
- React Router
- TanStack Query
- React Hook Form
- Zod

Use the Google Stitch prototype as the UI and UX reference.

The frontend should be fully responsive.

---

## Backend

Use:

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- MySQL 8

Alternative backend frameworks may only be used if there is already an established project architecture.

---

## Other Infrastructure

Use:

- Redis for caching and optional session/rate-limiting support
- S3-compatible storage for file uploads
- JWT or secure session-based authentication
- SMTP or transactional email provider abstraction
- SMS provider abstraction
- Payment provider abstraction

Do not tightly couple the core application to one SMS or payment provider.

---

# 3. PROJECT ARCHITECTURE

Structure the application as a modular monolith initially.

Do not begin with microservices.

Recommended structure:

```text
edupalgh/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   └── config/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docs/
│
├── docker/
│
├── .env.example
├── package.json
└── README.md
```

If using separate frontend and backend repositories, preserve the same logical separation.

---

# 4. MULTI-TENANT ARCHITECTURE

Use a shared database with tenant-aware tables.

Every tenant-specific entity must include:

```text
tenantId
```

Example:

```text
Student
Teacher
Parent
Class
Subject
Payment
Invoice
Attendance
Result
Admission
Announcement
User
```

must all be associated with a tenant.

---

## Tenant Model

Create a central `Tenant` or `School` entity.

Recommended fields:

```text
id
uuid
name
slug
schoolCode
schoolType
email
phone
address
city
country
currency
timezone
logoUrl
primaryColor
secondaryColor
subscriptionPlanId
subscriptionStatus
isActive
createdAt
updatedAt
```

School type enum:

```text
BASIC
```

---

# 5. TENANT IDENTIFICATION

Tenant identification should support:

```text
schoolslug.edupalgh.com
```

and potentially:

```text
portal.schooldomain.com
```

The API must resolve the current tenant before processing tenant-specific requests.

Recommended request lifecycle:

```text
Incoming Request
      ↓
Authentication
      ↓
Tenant Resolution
      ↓
Tenant Validation
      ↓
Role / Permission Validation
      ↓
Business Logic
      ↓
Tenant-Scoped Database Query
      ↓
Response
```

Never trust a tenant ID sent directly by the frontend if the tenant can already be determined from the authenticated user or hostname.

---

# 6. CRITICAL TENANT SECURITY RULE

Do not write database queries like:

```ts
prisma.student.findMany();
```

for tenant-owned data.

All tenant-specific queries must be scoped.

Example:

```ts
prisma.student.findMany({
  where: {
    tenantId: currentTenant.id,
  },
});
```

Create reusable services or repository helpers to enforce tenant scoping.

Never rely only on frontend restrictions.

Tenant isolation must be enforced server-side.

---

# 7. AUTHENTICATION

Implement secure authentication.

Support:

- Email and password
- Password reset
- Email verification
- Account invitation
- Account activation
- Optional MFA-ready architecture
- Refresh token/session rotation
- Logout
- Logout all devices
- Login history

Passwords must be hashed using a secure password hashing algorithm.

Never store plain-text passwords.

---

# 8. USER MODEL

Create a `User` model.

Suggested fields:

```text
id
tenantId
firstName
lastName
email
phone
passwordHash
avatarUrl
status
lastLoginAt
emailVerifiedAt
createdAt
updatedAt
```

Some users may be platform-level users and therefore have no tenant.

Examples:

```text
SUPER_ADMIN
PLATFORM_SUPPORT
```

---

# 9. ROLE-BASED ACCESS CONTROL

Implement full RBAC.

Do not hard-code all permissions by role.

Create:

```text
Role
Permission
RolePermission
UserRole
```

Example permissions:

```text
students.view
students.create
students.update
students.delete

attendance.view
attendance.take
attendance.update

finance.view
finance.payment.create
finance.payment.refund

results.view
results.enter
results.submit
results.approve
results.publish

users.view
users.invite
users.update

reports.view
reports.export

settings.view
settings.update
```

Allow tenants to create custom roles.

---

# 10. DEFAULT SCHOOL ROLES

Seed default roles:

```text
School Administrator
Principal / Head Teacher
Academic Administrator
Teacher
Accountant
Admissions Officer
Librarian
HR Officer
```

The tenant administrator can modify permissions.

---

# 11. PLATFORM ROLES

Support separate platform roles:

```text
SUPER_ADMIN
PLATFORM_SUPPORT
```

These users manage the SaaS platform itself.

They must not be treated as ordinary school users.

---

# 12. SCHOOL CONFIGURATION

Each tenant must have configurable settings.

Build settings sections for:

- School profile
- Logo
- Branding
- Address
- Currency
- Timezone
- Academic structure
- Academic year
- Term naming
- Assessment rules
- Grading rules
- Student ID format
- Staff ID format
- Invoice format
- Receipt format
- Report card settings
- Communication settings
- Payment integrations
- SMS integrations

---

# 13. ACADEMIC STRUCTURE ENGINE

Do not build three completely separate academic systems.

Create one flexible academic engine.

---

## Primary and Secondary

Hierarchy:

```text
Academic Year
    ↓
Term
    ↓
Class
    ↓
Subject
```

Example:

```text
2026/2027
Term 1
Primary 5A
Mathematics
```

---

# 14. ACADEMIC YEAR MODEL

Create:

```text
AcademicYear
```

Fields:

```text
id
tenantId
name
startDate
endDate
isCurrent
status
createdAt
updatedAt
```

Example:

```text
2026/2027
```

Only one academic year should normally be current per tenant.

---

# 15. ACADEMIC PERIOD MODEL

Create a model for school terms.

Recommended generic model:

```text
AcademicPeriod
```

Fields:

```text
id
tenantId
academicYearId
name
type
startDate
endDate
isCurrent
status
```

Type:

```text
TERM
```

---

# 16. STUDENT MANAGEMENT

Create complete student management.

Student model should include:

```text
id
tenantId
studentNumber
firstName
middleName
lastName
dateOfBirth
gender
photoUrl
email
phone
address
city
country
admissionDate
status
currentEnrollmentId
createdAt
updatedAt
```

Student status:

```text
ACTIVE
INACTIVE
TRANSFERRED
WITHDRAWN
GRADUATED
SUSPENDED
ARCHIVED
```

---

# 17. STUDENT NUMBER UNIQUENESS

A student number only needs to be unique within the tenant.

Create a composite unique constraint:

```text
tenantId + studentNumber
```

Example Prisma concept:

```prisma
@@unique([tenantId, studentNumber])
```

---

# 18. STUDENT GUARDIANS

Create:

```text
Guardian
StudentGuardian
```

A guardian may have multiple children.

A student may have multiple guardians.

Fields should include:

```text
firstName
lastName
relationship
phone
email
address
occupation
isEmergencyContact
isFinanciallyResponsible
```

---

# 19. STUDENT ENROLLMENT HISTORY

Never overwrite a student's academic history when they move to another class or level.

Create:

```text
StudentEnrollment
```

Fields:

```text
id
tenantId
studentId
academicYearId
academicPeriodId
classId
status
enrollmentDate
endDate
```

This allows:

```text
2025/2026 → Primary 4
2026/2027 → Primary 5
```

or:

```text
2025/2026 → Level 100
2026/2027 → Level 200
```

---

# 20. ADMISSIONS MODULE

Implement admissions separately from enrolled students.

Create:

```text
AdmissionApplication
```

Fields should include:

```text
applicationNumber
tenantId
firstName
lastName
gender
dateOfBirth
email
phone
guardianName
guardianPhone
requestedClassId
academicYearId
status
paymentStatus
submittedAt
reviewedAt
createdAt
updatedAt
```

Statuses:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
OFFERED
ACCEPTED
REJECTED
ENROLLED
```

Accepted applicants should be convertible into student records.

---

# 21. CLASSES

For primary and secondary schools create:

```text
Class
```

Fields:

```text
id
tenantId
name
section
levelOrder
classTeacherId
academicYearId
status
```

Example:

```text
Primary 4A
Primary 4B
JHS 1A
```

---

# 22. SUBJECTS

Create a reusable academic content structure.

```text
Subject
```

Fields should include:

```text
id
tenantId
name
code
description
creditHours
status
```

Credit hours may be nullable for primary and secondary institutions.

---

# 26. TEACHER ASSIGNMENTS

Create:

```text
TeacherAssignment
```

This should associate:

```text
teacher
academicYear
academicPeriod
class
subject
```

Do not hard-code teacher assignment directly into the teacher record.

---

# 27. STAFF MANAGEMENT

Create staff profiles.

Fields:

```text
id
tenantId
employeeNumber
firstName
middleName
lastName
email
phone
gender
photoUrl
position
employmentType
employmentDate
status
```

Employment types:

```text
FULL_TIME
PART_TIME
CONTRACT
TEMPORARY
```

---

# 28. ATTENDANCE

Support student attendance.

Create:

```text
AttendanceSession
AttendanceRecord
```

AttendanceSession:

```text
tenantId
academicYearId
academicPeriodId
classId
date
createdBy
```

AttendanceRecord:

```text
attendanceSessionId
studentId
status
remarks
```

Statuses:

```text
PRESENT
ABSENT
LATE
EXCUSED
```

---

# 29. ATTENDANCE RULES

Prevent duplicate attendance records for the same student and session.

Allow:

- Mark all present
- Update individual status
- Add remarks
- View attendance history
- Calculate attendance percentages

---

# 30. TIMETABLE

Create timetable management.

Fields should support:

```text
tenantId
academicYearId
academicPeriodId
classId
subjectId
teacherId
room
dayOfWeek
startTime
endTime
```

Detect conflicts involving:

- Teacher
- Room
- Class
- Class
- Time

---

# 31. ASSESSMENT CONFIGURATION

Each tenant must define its own assessment structure.

Do not hard-code:

```text
30% coursework
70% exam
```

Create:

```text
AssessmentScheme
AssessmentComponent
```

Example:

```text
Class Work 10%
Assignment 10%
Mid-Term 20%
Final Examination 60%
```

Validate that active components total 100% where appropriate.

---

# 32. GRADING SYSTEM

Create:

```text
GradingScheme
GradeBoundary
```

Example:

```text
80 - 100 → A
70 - 79 → B
60 - 69 → C
50 - 59 → D
0 - 49 → F
```

# 33. RESULTS

Create:

```text
ResultEntry
```

Fields should support:

```text
tenantId
studentId
academicYearId
academicPeriodId
classId
subjectId
assessmentComponentId
rawScore
weightedScore
enteredBy
status
createdAt
updatedAt
```

---

# 34. RESULT WORKFLOW

Support:

```text
DRAFT
SUBMITTED
APPROVED
PUBLISHED
```

Teachers should not automatically publish results.

Recommended workflow:

```text
Teacher enters scores
      ↓
Teacher saves draft
      ↓
Teacher submits
      ↓
Academic Administrator approves
      ↓
Results published
```

---

# 35. RESULT AUDITABILITY

Any score modification after submission should be logged.

Record:

```text
oldScore
newScore
changedBy
reason
timestamp
```

Never silently modify academic results.

---

# 36. REPORT CARDS

Generate basic-school report cards.

Include:

- School branding
- Student information
- Academic year
- Term
- Subjects
- Coursework
- Examination
- Total
- Grade
- Position if enabled
- Attendance
- Teacher remarks
- Head teacher remarks
- Promotion status

Use tenant-specific templates.

---

# 38. PROMOTION AND PROGRESSION

Create year-end progression workflows.

Actions:

```text
PROMOTE
REPEAT
TRANSFER
WITHDRAW
GRADUATE
```

Allow bulk promotion.

Example:

```text
Primary 4 → Primary 5
```

or:

```text
Level 100 → Level 200
```

Create new enrollment records rather than replacing old records.

---

# 39. FEES MODULE

Create:

```text
FeeCategory
FeeStructure
StudentCharge
Invoice
InvoiceItem
Payment
PaymentAllocation
Discount
Scholarship
```

---

# 40. FEE CATEGORIES

Examples:

```text
Tuition
Admission Fee
PTA
Examination
Books
Transport
Hostel
Feeding
Technology
Other
```

Tenants must be able to create custom fee categories.

---

# 41. FEE STRUCTURES

Allow fees to apply to:

- Entire school
- Specific class
- Specific class
- Specific level
- Individual student

Support academic year and academic period assignment.

---

# 42. STUDENT FINANCIAL LEDGER

Every student must have a transaction ledger.

Do not calculate balances from a single stored `balance` field only.

Maintain transaction history.

Ledger should support:

```text
Charge
Payment
Discount
Refund
Adjustment
Scholarship
```

Display:

```text
Total Charges
Total Payments
Total Discounts
Outstanding Balance
```

---

# 43. PAYMENTS

Payment model:

```text
id
tenantId
studentId
receiptNumber
amount
paymentMethod
reference
paymentDate
receivedBy
status
notes
createdAt
```

Payment methods:

```text
CASH
MOBILE_MONEY
CARD
BANK_TRANSFER
CHEQUE
OTHER
```

---

# 44. RECEIPT NUMBERS

Receipt numbers must be unique within each tenant.

Allow configurable receipt formats.

Example:

```text
NCOE/REC/2026/000123
```

Use server-side generation.

Do not generate receipt numbers only in the frontend.

---

# 45. PAYMENT ALLOCATION

A single payment may pay multiple invoice items.

Use:

```text
PaymentAllocation
```

Example:

```text
GHS 1,000 payment

GHS 600 → Tuition
GHS 250 → Books
GHS 150 → PTA
```

---

# 46. FINANCE SECURITY

Only authorized roles may:

- Record payments
- Edit payments
- Reverse payments
- Apply discounts
- Issue refunds
- Export financial data

Avoid deleting financial transactions.

Use reversal records instead where possible.

---

# 47. ANNOUNCEMENTS

Create:

```text
Announcement
```

Support audiences:

```text
ALL
STUDENTS
PARENTS
STAFF
TEACHERS
CLASS
CUSTOM
```

Fields:

```text
title
message
priority
publishAt
expiresAt
createdBy
```

---

# 48. NOTIFICATIONS

Create a reusable notification service.

Channels:

```text
IN_APP
EMAIL
SMS
```

Support future push notifications.

Do not write SMS provider logic directly inside business modules.

Use an abstraction:

```ts
NotificationService.send(...)
```

---

# 49. LIBRARY MODULE

Build after core academic modules.

Models:

```text
Book
BookCopy
BookCategory
LibraryLoan
LibraryFine
```

Support:

- Search catalogue
- Borrow
- Return
- Overdue
- Fine
- Lost book
- Damaged book

---

# 50. TRANSPORT MODULE

Optional tenant module.

Models:

```text
Vehicle
Driver
TransportRoute
TransportStop
StudentTransportAssignment
```

Allow the module to be disabled.

---

# 51. HOSTEL MODULE

Optional tenant module.

Models:

```text
Hostel
HostelBlock
Room
Bed
HostelAssignment
```

Support:

- Bed allocation
- Check-in
- Check-out
- Occupancy
- Hostel charges

---

# 52. FILE MANAGEMENT

Create secure file upload infrastructure.

Files may include:

- Student photos
- Staff photos
- Admission documents
- Certificates
- School logos
- Report templates
- Supporting documents

Store metadata in the database.

Store files in S3-compatible object storage.

Do not save production uploads directly inside the application source directory.

---

# 53. AUDIT LOGGING

Create:

```text
AuditLog
```

Fields:

```text
id
tenantId
userId
action
module
entityType
entityId
oldValue
newValue
ipAddress
userAgent
createdAt
```

Audit critical operations including:

- Login
- Failed login
- Student modifications
- Result modifications
- Financial changes
- Permission changes
- User changes
- Settings changes
- Exports
- Record archiving

---

# 54. SOFT DELETION

Important records should generally use soft deletion.

Example:

```text
deletedAt
```

Do not permanently delete:

- Students
- Financial records
- Results
- Attendance
- Staff
- Admissions

unless explicitly required by system policy.

---

# 55. PLATFORM SUPER ADMIN

Create a separate platform administration area.

Super Admin navigation:

```text
Dashboard
Schools
Subscriptions
Plans
Billing
Support
System Analytics
Audit Logs
Platform Settings
```

---

# 56. PLATFORM DASHBOARD

Display:

- Total schools
- Active schools
- Suspended schools
- Trial schools
- Total students
- Total platform users
- Monthly recurring revenue
- New subscriptions
- Storage usage
- SMS usage

---

# 57. SCHOOL MANAGEMENT

Super Admin should be able to:

- Create school
- View school
- Activate school
- Suspend school
- Change plan
- View subscription
- View usage
- View tenant administrator
- Reset administrator access if authorized

Be careful with impersonation.

If implementing "Login as School Administrator", record every impersonation event in audit logs.

---

# 58. SUBSCRIPTIONS

Create:

```text
SubscriptionPlan
Subscription
```

Subscription plan fields:

```text
name
monthlyPrice
annualPrice
maxStudents
maxStaff
maxCampuses
storageLimit
smsCredits
features
status
```

Example plans:

```text
Starter
Professional
Enterprise
```

---

# 59. FEATURE FLAGS

Use tenant-level feature flags.

Example:

```text
libraryEnabled
transportEnabled
hostelEnabled
payrollEnabled
smsEnabled
onlinePaymentsEnabled
```

Prefer a normalized or JSON-based feature configuration over adding endless boolean database columns if the architecture supports it cleanly.

---

# 60. API DESIGN

Build REST APIs using predictable conventions.

Example:

```text
GET    /api/students
POST   /api/students
GET    /api/students/:id
PATCH  /api/students/:id
DELETE /api/students/:id
```

Do not expose tenant IDs unnecessarily in URLs.

Tenant is determined from authentication and tenant context.

---

# 61. API RESPONSE FORMAT

Use consistent responses.

Example:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

For errors:

```json
{
  "success": false,
  "message": "Student not found",
  "code": "STUDENT_NOT_FOUND",
  "errors": null
}
```

---

# 62. PAGINATION

All large lists should support server-side pagination.

Use parameters such as:

```text
page
limit
search
sortBy
sortOrder
```

Example:

```text
GET /api/students?page=1&limit=25&search=mensah
```

---

# 63. FILTERING

Support backend filtering for:

- Academic year
- Academic period
- Class
- Gender
- Status
- Date range

Do not load thousands of records into the browser just to filter them client-side.

---

# 64. VALIDATION

Use Zod or equivalent.

Validate data at the API boundary.

Do not rely only on frontend validation.

Validate:

- Required fields
- Email
- Phone
- Currency values
- Dates
- Score ranges
- Percentages
- IDs
- Permission-sensitive actions

---

# 65. ERROR HANDLING

Create centralized API error handling.

Never expose:

- SQL errors
- Stack traces
- Database credentials
- Internal server paths

to production users.

Log internal technical errors separately.

---

# 66. FRONTEND STRUCTURE

Recommended feature structure:

```text
src/
├── app/
├── components/
├── layouts/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── students/
│   ├── admissions/
│   ├── academics/
│   ├── attendance/
│   ├── results/
│   ├── finance/
│   ├── staff/
│   ├── guardians/
│   ├── communication/
│   ├── reports/
│   └── settings/
├── hooks/
├── services/
├── lib/
├── types/
└── utils/
```

Do not put the whole application inside one `components` directory.

---

# 67. FRONTEND ROUTES

Example tenant routes:

```text
/dashboard

/students
/students/new
/students/:id

/admissions

/academics/classes
/academics/subjects
/academics/classes
/academics/subjects
/academics/timetable

/attendance

/results

/finance
/finance/invoices
/finance/payments
/finance/fees

/staff
/guardians

/communication

/reports

/settings
```

---

# 68. PLATFORM ROUTES

Use separate routes:

```text
/platform/dashboard
/platform/schools
/platform/subscriptions
/platform/plans
/platform/billing
/platform/settings
```

Do not mix platform administration screens with normal tenant administration.

---

# 69. UI IMPLEMENTATION RULES

Follow the Google Stitch prototype closely.

Create reusable components for:

- Page headers
- Metric cards
- Tables
- Filters
- Status badges
- Empty states
- Search boxes
- Pagination
- Form fields
- Modals
- Confirm dialogs
- Dropdown menus
- Tabs
- Date pickers
- File uploaders
- Toasts
- Loading skeletons

Avoid duplicating identical UI markup.

---

# 70. DATA TABLES

Build reusable data tables with:

- Server pagination
- Search
- Sorting
- Filters
- Row selection
- Bulk actions
- Column visibility where useful
- Loading state
- Empty state
- Error state

---

# 71. FORMS

Use:

```text
React Hook Form
+
Zod
```

Form behavior should include:

- Client validation
- Server validation errors
- Dirty state
- Loading state
- Disabled submit during processing
- Success feedback

Do not allow accidental duplicate submissions.

---

# 72. DASHBOARD

Build tenant dashboard after authentication.

Cards:

- Total Students
- Total Staff
- Fees Collected
- Attendance Today

Widgets:

- Enrollment trend
- Fee collection
- Attendance overview
- Recent payments
- Upcoming events
- Recent announcements
- Outstanding fees
- Quick actions

Use real API data after backend endpoints exist.

Do not leave fake static dashboard numbers in production.

---

# 73. RESPONSIVE DESIGN

Desktop:

- Persistent sidebar
- Full tables
- Multi-column cards

Tablet:

- Collapsible sidebar

Mobile:

- Drawer navigation
- Stacked cards
- Responsive forms
- Horizontal table scrolling or mobile cards
- Large touch-friendly controls

---

# 74. ACCESSIBILITY

Implement:

- Proper labels
- Keyboard navigation
- Focus states
- Accessible dialogs
- ARIA where required
- Sufficient contrast
- Semantic headings

Do not use clickable `<div>` elements when buttons or links are appropriate.

---

# 75. SECURITY

Implement:

- Secure authentication
- Backend authorization
- Tenant isolation
- Rate limiting
- Secure headers
- CORS configuration
- Input validation
- SQL injection protection through ORM
- XSS prevention
- CSRF protection where applicable
- Secure cookies if using cookies
- Token expiration
- Refresh token rotation if using JWT
- Password hashing
- Environment variable protection
- Audit logging
- File upload validation

---

# 76. FINANCIAL DATA

Use decimal database types for monetary values.

Do not use JavaScript floating-point calculations carelessly for currency.

Example:

```text
Decimal(12,2)
```

Use safe decimal arithmetic.

---

# 77. DATE AND TIME HANDLING

Store timestamps consistently.

Prefer UTC in the database.

Render according to tenant timezone.

Each tenant must have a timezone setting.

---

# 78. DATABASE INDEXING

Add indexes on commonly queried fields.

Examples:

```text
tenantId
studentNumber
employeeNumber
academicYearId
academicPeriodId
studentId
classId
paymentDate
status
createdAt
```

Use compound indexes where appropriate.

---

# 79. DATABASE CONSTRAINTS

Use foreign keys and unique constraints where appropriate.

Examples:

```text
tenantId + studentNumber
tenantId + employeeNumber
tenantId + receiptNumber
tenantId + schoolCode
```

Do not rely only on frontend uniqueness checks.

---

# 80. TRANSACTIONS

Use database transactions for operations such as:

- Recording payments
- Payment allocation
- Student enrollment conversion
- Bulk promotion
- Result publishing
- Refunds
- Complex financial changes

Avoid partially completed operations.

---

# 81. IMPORTS

Implement CSV/XLSX imports later.

Required imports:

- Students
- Staff
- Subjects
- Fees
- Results

Import workflow:

```text
Upload
↓
Parse
↓
Validate
↓
Preview
↓
Show errors
↓
Confirm
↓
Import
```

Do not insert rows before validation is complete.

---

# 82. EXPORTS

Support:

- CSV
- Excel
- PDF

for authorized reports.

Exports must obey tenant and permission restrictions.

---

# 83. REPORTING

Build reporting APIs rather than calculating everything inside the frontend.

Reports:

Academic:

- Student performance
- Class performance
- Subject performance
- Examination analysis

Attendance:

- Daily attendance
- Monthly attendance
- Frequent absenteeism

Finance:

- Fee collection
- Outstanding fees
- Payment history
- Fee collection by class

Enrollment:

- Total enrollment
- New admissions
- Transfers
- Withdrawals
- Graduation

---

# 84. BACKUPS

Document a database backup strategy.

Production must support:

- Automated backups
- Retention
- Recovery testing

Do not rely only on hosting provider defaults.

---

# 85. LOGGING

Use structured backend logs.

Log:

- Request ID
- User ID
- Tenant ID
- Route
- Error
- Timestamp

Do not log:

- Passwords
- Raw tokens
- Sensitive credentials

---

# 86. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

Include placeholders for:

```text
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
REDIS_URL
APP_URL
API_URL
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
S3_ENDPOINT
S3_BUCKET
S3_ACCESS_KEY
S3_SECRET_KEY
PAYMENT_PROVIDER_KEY
SMS_PROVIDER_KEY
```

Never commit real secrets.

---

# 87. DEVELOPMENT ENVIRONMENT

Provide Docker configuration for local dependencies where useful.

Example:

```text
MySQL
Redis
Mail test server
```

Application development should be easy to start locally.

---

# 88. SEED DATA

Create database seed scripts.

Seed:

- Platform Super Admin
- Demo tenant
- Academic year
- Term
- Classes
- Subjects
- Demo staff
- Demo students
- Default roles
- Default permissions
- Grading scheme
- Assessment scheme

Clearly identify demo credentials in development documentation only.

---

# 89. TESTING

Implement:

## Unit tests

For:

- Grading calculations
- GPA calculations
- Fee balance calculations
- Permission checks
- Academic progression

## Integration tests

For:

- Authentication
- Student creation
- Attendance
- Payments
- Result workflow

## Security tests

Especially:

- Tenant A cannot access Tenant B data.
- Teacher cannot perform accountant actions.
- Accountant cannot publish academic results.
- Suspended tenant cannot access the system.

Tenant isolation tests are mandatory.

---

# 90. E2E TESTS

Add end-to-end tests for critical workflows.

Examples:

```text
Login
→ Add Student
→ Assign Class
→ Record Fee
→ Record Payment
→ Generate Receipt
```

and:

```text
Teacher Login
→ Take Attendance
→ Enter Results
→ Submit Results
→ Admin Approves
→ Publish Results
```

---

# 91. IMPLEMENTATION ORDER

Do not attempt to build every feature at once.

Use this development sequence.

---

# PHASE 1 — FOUNDATION

Build:

1. Project setup
2. Database connection
3. Prisma configuration
4. Tenant model
5. User model
6. Authentication
7. RBAC
8. Tenant middleware
9. Base dashboard layout
10. School settings
11. Platform Super Admin basics

Acceptance criteria:

- Multiple tenants can exist.
- Users belong to the correct tenant.
- Cross-tenant access is impossible.
- Roles and permissions work.
- UI shell matches Stitch design.

---

# PHASE 2 — ACADEMIC CORE

Build:

1. Academic years
2. Terms
3. Classes
4. Subjects
5. Staff
6. Form-teacher assignments

Acceptance criteria:

- Schools can configure classes from kindergarten through JHS and their subjects.

---

# PHASE 3 — STUDENTS

Build:

1. Student CRUD
2. Guardian CRUD
3. Student-guardian relationship
4. Enrollment
5. Enrollment history
6. Student profile
7. Student import framework

Acceptance criteria:

- Students are tenant-isolated.
- Students can have multiple guardians.
- Historical enrollment is preserved.

---

# PHASE 5 — ATTENDANCE

Build:

1. Attendance sessions
2. Attendance records
3. Classroom attendance UI
4. Attendance reports

Acceptance criteria:

- Teacher can quickly mark a class.
- Attendance is tied to academic period.
- Duplicate records are prevented.

---

# PHASE 6 — RESULTS

Build:

1. Assessment schemes
2. Grading schemes
3. Score entry
4. Result calculations
5. Submission
6. Approval
7. Publication
8. Report cards
9. GPA/CGPA where applicable

Acceptance criteria:

- Results are configurable per tenant.
- Result changes are audited.
- Teachers cannot directly publish unless permitted.

---

# PHASE 7 — FINANCE

Build:

1. Fee categories
2. Fee structures
3. Student charges
4. Invoices
5. Payments
6. Allocations
7. Receipts
8. Discounts
9. Financial reports

Acceptance criteria:

- Student ledger is accurate.
- Partial payments work.
- Receipts are unique.
- Financial changes are audited.

---

# PHASE 8 — COMMUNICATION

Build:

1. Announcements
2. In-app notifications
3. Email service abstraction
4. SMS service abstraction

---

# PHASE 9 — REPORTS

Build:

1. Enrollment reports
2. Attendance reports
3. Academic reports
4. Financial reports
5. Export functionality

---

# PHASE 10 — OPTIONAL MODULES

Build:

1. Library
2. Transport
3. Hostel
4. Inventory
5. Payroll if later required

Use feature flags.

---

# 92. FIRST DEVELOPMENT MILESTONE

Start by implementing only:

```text
Authentication
Tenant Resolution
RBAC
School Setup
Academic Year
Academic Period
Students
Classes
Subjects
Staff
Basic Dashboard
```

Do not begin finance, examinations, library, transport, or hostel before this foundation works correctly.

---

# 93. INITIAL DATABASE MODELS

Create the first Prisma schema with at minimum:

```text
Tenant
TenantSettings
User
Role
Permission
RolePermission
UserRole

AcademicYear
AcademicPeriod

Staff
Student
Guardian
StudentGuardian
StudentEnrollment

Class
Subject
TeacherAssignment

AuditLog
```

Create migrations.

Seed development data.

---

# 94. CODE QUALITY RULES

Use:

- TypeScript strict mode
- Clean naming
- Small functions
- Reusable services
- Reusable components
- Central validation
- Central error handling

Avoid:

- `any`
- giant route files
- duplicated business logic
- direct database access from frontend
- hard-coded tenant IDs
- hard-coded role names for permission decisions
- hard-coded school names
- hard-coded academic years

---

# 95. SERVICE LAYER

Use controllers only for HTTP-level concerns.

Example:

```text
Route
↓
Controller
↓
Service
↓
Repository / Prisma
```

Do not put all business logic directly inside Express routes.

---

# 96. DOMAIN SERVICES

Create focused services such as:

```text
TenantService
AuthService
StudentService
EnrollmentService
AcademicService
AttendanceService
ResultService
FinanceService
NotificationService
AuditService
```

---

# 97. AUDIT SERVICE

Provide a reusable helper:

```ts
auditService.log({
  tenantId,
  userId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
});
```

Call it from critical operations.

---

# 98. PERMISSION MIDDLEWARE

Provide reusable permission middleware.

Example:

```ts
requirePermission('students.create');
```

Usage:

```ts
router.post(
  '/students',
  authenticate,
  resolveTenant,
  requirePermission('students.create'),
  createStudent,
);
```

---

# 99. TENANT MIDDLEWARE

Create strongly typed request context.

Example:

```ts
req.auth = {
  userId,
  tenantId,
  roles,
  permissions,
};
```

Service methods should receive tenant context explicitly.

---

# 100. API DOCUMENTATION

Generate API documentation.

Prefer:

```text
OpenAPI / Swagger
```

Document:

- Authentication
- Students
- Academics
- Attendance
- Results
- Finance
- Platform administration

---

# 101. README

Create a strong root README containing:

- Project description
- Tech stack
- Requirements
- Installation
- Environment setup
- Database migration
- Seed instructions
- Running frontend
- Running backend
- Running tests
- Production build
- Architecture overview

---

# 102. CODING WORKFLOW

When implementing each module:

1. Define database model.
2. Avoid write so much code in one file break routes and controllers into smaller individual files
3. Create migration.
4. Create validation schemas.
5. Create repository queries.
6. Create business service.
7. Create controller.
8. Create routes.
9. Add permission checks.
10. Add audit logging where needed.
11. Add frontend API service.
12. Build UI from Stitch prototype.
13. Add loading states.
14. Add empty states.
15. Add error states.
16. Add tests.
17. Verify tenant isolation.

Do not skip directly to the UI.

---

# 103. BEFORE WRITING A MODULE

Inspect the existing repository first.

Do not overwrite working architecture unnecessarily.

Identify:

- Existing project structure
- Package manager
- Existing routes
- Existing design system
- Existing database configuration
- Existing authentication
- Existing environment variables

Reuse existing patterns where they are clean and compatible.

---

# 104. DATABASE CHANGES

Never manually edit production database structures.

Use Prisma migrations.

Name migrations clearly.

Example:

```text
20260802_add_student_enrollment
```

---

# 105. BACKWARD COMPATIBILITY

Once modules are in use, avoid breaking API contracts unnecessarily.

Prefer additive changes where possible.

Document breaking changes.

---

# 106. DO NOT IMPLEMENT YET

Do not initially build:

- Native mobile application
- AI chatbot
- Facial recognition
- GPS bus tracking
- Biometric devices
- Microservices
- Kubernetes
- Complex event streaming
- Blockchain
- Advanced predictive analytics

Design APIs so these could be added later, but prioritize the core school system.

---

# 107. INITIAL SUCCESS CRITERIA

The first usable release must allow a school administrator to:

1. Sign in securely.
2. Configure school profile.
3. Configure academic year.
4. Configure term.
5. Create classes.
6. Create subjects.
7. Add staff.
8. Add students.
9. Assign students to classes.
10. Assign teachers.
11. View dashboard information.
12. Manage users.
13. Assign roles and permissions.
14. View audit history.
15. Use the application without ever seeing another school's information.

---

# 108. MVP SUCCESS CRITERIA

The MVP is complete when a school can perform this workflow:

```text
School Created
↓
Administrator Invited
↓
School Configured
↓
Academic Year Created
↓
Term Created
↓
Classes Created
↓
Subjects Created
↓
Teachers Added
↓
Students Added
↓
Students Enrolled
↓
Attendance Taken
↓
Fees Assigned
↓
Payment Recorded
↓
Receipt Generated
↓
Assessment Created
↓
Scores Entered
↓
Results Approved
↓
Results Published
↓
Report Card Generated
```

All steps must be tenant-safe and permission-controlled.

---

# 109. IMPORTANT FINAL DEVELOPMENT RULES

Prioritize:

```text
Correctness
Security
Tenant isolation
Maintainability
Data integrity
Usability
Performance
```

before adding extra features.

Never sacrifice tenant isolation for development convenience.

Never trust the frontend for authorization.

Never store financial or academic history only as derived UI state.

Never overwrite historical enrollment records.

Never permanently delete important accounting or academic transactions unless explicitly required.

Never hard-code one school's academic model into the platform.

Keep institution terminology configurable.

Build the application as a reusable SaaS platform, not as a custom application for one school.

---

# 110. FIRST TASK FOR CODEX

Begin by inspecting the existing repository and Google Stitch-generated frontend.

Then:

1. Document the current project structure.
2. Identify reusable UI components.
3. Set up the backend architecture.
4. Configure Prisma with MySQL.
5. Create the first database schema.
6. Implement Tenant.
7. Implement User.
8. Implement authentication.
9. Implement RBAC.
10. Implement tenant-resolution middleware.
11. Implement audit logging foundation.
12. Build School Settings.
13. Build Academic Year and Academic Period management.
14. Build Student CRUD.
15. Connect the existing Stitch UI to the real API.

Before moving to finance, results, attendance, or admissions, verify with automated tests that one tenant cannot read, modify, delete, or enumerate another tenant's data.

Do not generate placeholder-only architecture. Begin implementing working code module by module while preserving the existing UI design.
