# Lesson-plan service

The module recreates the publicly observable class → term → subject → week workflow using teacher-entered content. It does not integrate with Sirbus, copy its curriculum library, or require a paid AI provider.

## Reference observations and limits

- Public catalogue: https://sirbus.org/lesson-plans/
- Class/term/subject example: https://sirbus.org/lesson-plans/basic-4/term-1/mathematics/
- Weekly structure: https://sirbus.org/lesson-plans/basic-4/term-1/mathematics/week-1/
- The editor URL https://sirbus.org/dashboard/lesson-notes/new/ redirects to login without authentication.
- Observed fields include strand, sub-strand, content standard, indicator, performance indicator, competencies, resources, keywords and three lesson phases. A public subject catalogue shows weeks 1–12.
- REA inspected the captured public HTML and three publicly served JavaScript files. Parent Evidence: `ev_b9882c34a29ee089d63d21fdfe2cffceec274a36f251d7c49c3c345daac556a2`. Analysis is partial: thirteen scripts and inline bootstrap bodies were outside scope, and a semantic-node limit was reached. This does not establish private API behavior or runtime execution.
- EduCore's persistence, permissions, revision handling, readiness checks and editable templates are implementation decisions, not claims about Sirbus internals.

## Enable after review

No database was contacted during implementation. Apply the committed additive migration using the project's normal deployment process before using the API. The migration adds `LessonPlan` and assigns the new permissions to existing default system roles. It does not modify lesson content or student records.

```sh
npx prisma migrate deploy
npx prisma generate
```

Refresh the authenticated session after migration so navigation has the new permissions. Custom roles must be explicitly granted `lesson-plans.view`, `lesson-plans.manage`, and/or `lesson-plans.review` in Users & Roles.

## Behavior

- Navigate to `#/lesson-plans` under Academics.
- Select an assigned class, term and class subject; choose 1–16 weeks (default 12), duration and optional one-topic-per-line input.
- The service creates blank editable weekly templates. Teachers provide curriculum codes, learning outcomes, resources and activities; no curriculum certification is claimed.
- Save drafts at any stage. Ready status requires each week's topic, outcome, resources, starter, main activity, assessment and plenary.
- Only the author may edit. Form teachers may create for their assigned class subjects; subject teachers may create for their assigned subject. Reviewers can read the school library. Cross-school lookups remain scoped and return not-found.
- Updates require the current revision. A conflicting save returns 409 and leaves local edits available for recovery.
- Archiving is reversible by saving a draft/ready status; there is no deletion route.
- Preview uses the last saved version, with cover page, term scheme and weekly notes. Print / Save as PDF uses the browser print dialog; it is not a server PDF renderer. JSON download exports a portable snapshot, without public sharing links or import execution.
- Creates/updates and audit entries use one Prisma transaction. No external service calls occur in a write transaction.

## API

All paths are under `/api/lesson-plans` and require authentication, an active tenant/subscription and `lesson-plans.view`.

| Method | Path | Additional permission |
| --- | --- | --- |
| GET | `/options` | None |
| GET | `/?scope=mine&status=DRAFT&page=1&limit=20` | `lesson-plans.review` for `scope=school` |
| POST | `/` | `lesson-plans.manage` |
| GET | `/:id` | Owner or reviewer |
| PUT | `/:id` | `lesson-plans.manage` and ownership |
| GET | `/:id/booklet` | Owner or reviewer |

## Validation

```sh
node --test tests/lesson-plans.test.js
npm run lint
npm run build
npx prisma validate
```

Unit tests use injected transaction clients and never connect to a database. They cover ownership, tenant predicates, assignment checks, revision conflicts, readiness, bounds and audit error propagation. Database rollback/constraint enforcement and browser print pagination still require an isolated integration environment; the unit tests do not prove them.
