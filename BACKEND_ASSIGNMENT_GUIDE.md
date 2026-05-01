# Finance Dashboard Backend Assignment Guide

This guide explains a clean way to solve the assignment and what interviewers usually expect.

## 1) Choose a simple, clear stack
A practical stack for this task:
- **Framework**: Node.js + Express (or NestJS if you prefer structure)
- **Database**: SQLite + Prisma (fast to set up, persistent, easy migrations)
- **Auth**: JWT token auth
- **Validation**: Zod/Joi/class-validator

You can finish quickly while still demonstrating strong backend design.

---

## 2) Suggested project structure
Use layered architecture so business logic is not inside route handlers.

```text
src/
  app.ts
  server.ts
  config/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.routes.ts
    users/
      user.controller.ts
      user.service.ts
      user.routes.ts
      user.model.ts
    records/
      record.controller.ts
      record.service.ts
      record.routes.ts
      record.model.ts
    dashboard/
      dashboard.controller.ts
      dashboard.service.ts
      dashboard.routes.ts
  middleware/
    auth.middleware.ts
    role.middleware.ts
    error.middleware.ts
  utils/
    api-response.ts
    pagination.ts
  db/
    prisma.ts
```

Why this works:
- **Controllers**: request/response only
- **Services**: business rules
- **Models/ORM**: persistence
- **Middleware**: auth, role checks, validation, error handling

---

## 3) Data modeling (minimum viable schema)

### User
- `id` (uuid/int)
- `name`
- `email` (unique)
- `passwordHash`
- `role` (`VIEWER | ANALYST | ADMIN`)
- `status` (`ACTIVE | INACTIVE`)
- `createdAt`, `updatedAt`

### FinancialRecord
- `id`
- `amount` (decimal)
- `type` (`INCOME | EXPENSE`)
- `category` (string)
- `recordDate` (date)
- `notes` (optional)
- `createdBy` (user id)
- `isDeleted` (optional soft delete)
- `createdAt`, `updatedAt`

Design note: storing `type` separately from signed amount keeps logic clearer for summaries.

---

## 4) RBAC (Role-Based Access Control) matrix
Define this clearly in code and README.

| Action | Viewer | Analyst | Admin |
|---|---|---|---|
| View records | ✅ | ✅ | ✅ |
| Create record | ❌ | ❌ (or optional ✅) | ✅ |
| Update record | ❌ | ❌ (or limited) | ✅ |
| Delete record | ❌ | ❌ | ✅ |
| View dashboard summaries | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

Implement with middleware like `authorize(["ADMIN"])`.

---

## 5) API design (what to implement)

## Auth
- `POST /auth/register` (optional seed/admin bootstrap)
- `POST /auth/login` -> returns JWT

## Users (admin only except self profile)
- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id` (role/status updates)
- `PATCH /users/:id/status`

## Records
- `POST /records` (admin)
- `GET /records` (viewer/analyst/admin)
  - filters: `type`, `category`, `fromDate`, `toDate`
  - pagination: `page`, `limit`
- `GET /records/:id`
- `PATCH /records/:id` (admin)
- `DELETE /records/:id` (admin or soft delete)

## Dashboard summaries
- `GET /dashboard/summary`
  - totalIncome
  - totalExpense
  - netBalance
- `GET /dashboard/category-totals?fromDate=&toDate=`
- `GET /dashboard/trends?period=monthly|weekly&fromDate=&toDate=`
- `GET /dashboard/recent-activity?limit=10`

---

## 6) Validation and error handling expectations
Use request validation on every write endpoint.

Examples:
- `amount > 0`
- `type` must be `INCOME` or `EXPENSE`
- `recordDate` must be valid ISO date
- role/status must be enum values

Return consistent errors:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {"field": "amount", "message": "Amount must be greater than 0"}
  ]
}
```

Recommended status codes:
- `200` OK
- `201` Created
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict
- `500` Internal Server Error

---

## 7) Summary query logic (important for evaluation)
Keep aggregation in service/repository, not controller.

Examples:
- `totalIncome = SUM(amount where type=INCOME)`
- `totalExpense = SUM(amount where type=EXPENSE)`
- `netBalance = totalIncome - totalExpense`
- category totals grouped by `category`
- trends grouped by month/week extracted from `recordDate`

Mention assumptions in README (timezone, currency, date range defaults).

---

## 8) Step-by-step implementation plan
1. Initialize project and lint/formatter.
2. Add DB schema + migrations.
3. Build auth + JWT middleware.
4. Build users module + admin role management.
5. Build records CRUD with filters + pagination.
6. Build dashboard aggregate endpoints.
7. Add global validation + error middleware.
8. Add seed data script.
9. Add tests for RBAC and summary logic.
10. Write README with setup, API examples, and tradeoffs.

---

## 9) What to include in README (high scoring)
- Problem statement and assumptions
- Tech stack and why chosen
- ERD or simple schema diagram
- Setup steps
- Env variables
- Migration + seed commands
- API endpoint table
- RBAC table
- Sample requests/responses
- Tradeoffs / future improvements

---

## 10) Common mistakes to avoid
- Putting all logic in routes/controllers
- Missing role checks on write endpoints
- No validation for dates/amounts/enums
- Inconsistent error formats
- No pagination on list endpoint
- No explanation of assumptions

---

## 11) Minimal “extra credit” set
If time allows, add only high-impact extras:
- refresh token flow
- soft deletes
- unit tests for dashboard calculations
- OpenAPI/Swagger docs

These show engineering maturity without overbuilding.

---

## 12) If you want the fastest path
Build this minimum and stop:
- JWT auth
- users with role/status
- records CRUD + filters
- dashboard summary + category totals
- RBAC middleware
- validation + global error handler
- clean README

That is fully enough for a strong assessment submission.
