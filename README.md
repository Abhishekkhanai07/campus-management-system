# Campus — School & College Management System

Full-stack implementation of the requirements in the SRS document.

**Stack:** React 18 + TypeScript + Vite + Tailwind (frontend) · NestJS 10 + Prisma 5 + PostgreSQL (backend) · built-in AI assistant that answers from live data.

---

## 1. Run it

You need Node 18+ and Docker (for PostgreSQL). From the project root:

```bash
bash setup.sh
```

That starts PostgreSQL, installs both apps, creates the schema and loads demo data. Then open two terminals:

```bash
cd apps/api && npm run dev     # http://localhost:4000/api
cd apps/web && npm run dev     # http://localhost:5173
```

### Run the complete application with Docker

Docker Desktop can run PostgreSQL, Adminer, the NestJS API, and the React frontend together:

```powershell
docker compose up --build -d
```

Open the application at `http://localhost:5173`. Adminer is available at `http://localhost:8081` with:

```text
Server: db
Username: campus
Password: campus
Database: campus
```

After the images have been built, start the application each day with:

```powershell
docker compose up -d
```

Run `docker compose up --build -d` again after changing application code or Dockerfiles. Stop the containers with `docker compose down`; do not use `docker compose down -v` unless you intend to delete the PostgreSQL data volume.

<details>
<summary>Manual steps, if you prefer</summary>

```bash
docker compose up -d                       # PostgreSQL on 5432, Adminer on 8081

cd apps/api
cp .env.example .env
npm install
npx prisma generate
npx prisma db push                         # creates all tables
npm run seed                               # demo institute + 120 students
npm run dev

cd ../web
cp .env.example .env
npm install
npm run dev
```

Already have PostgreSQL? Skip Docker and point `DATABASE_URL` in `apps/api/.env` at your own server.
</details>

---

## 2. Demo logins

Password for every account: **`Campus@123`**

| Role | Login ID | What they see |
|---|---|---|
| Super admin | `superadmin` | Everything, plus the full activity log |
| Principal / Admin | `EMP0001` | Whole institute, approvals, setup |
| Head of department | `EMP0002` | Department staff, approvals, reports |
| Teacher | `EMP0005` … `EMP0013` | Only their own subjects and students |
| Teacher on leave today | `EMP0007` | Shows the substitution flow |
| Accountant | `EMP0003` | Fees only |
| Office | `EMP0004` | Admissions and records |
| Student | `ADM20260001` | Only their own record |
| Parent | `parent1` | Only their ward's record |

The seed builds: 6 sections across Classes 8–10, ~120 students with guardians, 12 teachers, a clash-free timetable, 30 working days of attendance, 12 assignments with mixed submissions, one published unit test with ranks, fee structures with part payments and dues, and one approved leave that has already generated substitution rows (one deliberately left uncovered so you can demo assigning cover).

---

## 3. What the client asked for, and where it is

| Requirement | Where |
|---|---|
| Student attendance | `/attendance` — day register and subject period |
| Exam marks | `/exams` → marks entry grid, then process and publish |
| Assignment submitted or not | `/assignments/:id` — class list with a status per student |
| Fee status | `/fees` — dues with ageing, collection with receipt numbers |
| Which teacher teaches which subject | `/allocation` — matrix per section |
| Who is class teacher | `/allocation` — one dropdown per section |
| Teacher absent → who takes that class | `/substitutions` — ranked suggestions, one click to assign |
| Class strength | `/students` — strength, capacity and vacant seats per section |
| Teacher login: own subjects and students only | Enforced server-side in every query, not hidden in the UI |
| Teacher leave application | `/leave` — the approver sees exactly which periods go uncovered |
| Student login: own data only | `/me/attendance`, `/me/results`, `/me/fees` |
| Super admin sees all activity | `/audit` — append-only log, sensitive actions highlighted |
| Attendance by class teacher **and** subject teacher | Two separate registers: `DailyAttendance` and `PeriodAttendance` |
| AI assistant | "Ask Campus" button, bottom right of every screen |

---

## 4. The AI assistant

The assistant answers questions from the live database — it never guesses numbers.

- It runs **read-only tools** (class strength, attendance today, defaulters, substitution board, fee dues, exam analysis, student lookup, and so on).
- Every tool re-checks the caller's role on the server, so a student asking "who has fee dues" gets told their role cannot see that. The assistant can never widen someone's access.
- With `ANTHROPIC_API_KEY` set in `apps/api/.env`, it uses Claude with tool calling for natural conversation.
- **With no API key it still works.** An offline keyword matcher picks the right tool and formats the real data. This matters for a school server without outbound internet.

Try: *"How many students in each class?"*, *"Which periods need a substitute today?"*, *"Who is below 75%?"*, *"What is pending for my approval?"*

---

## 5. Architecture

```
campus/
├─ docker-compose.yml         PostgreSQL, Adminer, API, and web services
├─ apps/api/                  NestJS
│  ├─ Dockerfile              production API image
│  ├─ .dockerignore           API Docker build exclusions
│  ├─ prisma/schema.prisma    40+ models, the whole data model
│  ├─ prisma/seed.ts          demo institution
│  └─ src/
│     ├─ auth/                JWT, account lockout, per-request scope rebuild
│     ├─ academic/            years, classes, sections, subjects, allocation, timetable
│     ├─ students/            admission, 360° profile, strength, student leave
│     ├─ staff/               teacher profile, "what do I teach"
│     ├─ attendance/          daily + period, register, defaulters, corrections
│     ├─ leaves/              leave, approval, substitution board, suggestions
│     ├─ assignments/         create, submit, evaluate, compliance
│     ├─ exams/               marks entry, result processing, analysis, report card
│     ├─ fees/                heads, structures, collection, dues ageing
│     ├─ dashboard/           one payload per role
│     ├─ audit/               append-only activity log
│     ├─ ai/                  assistant + role-scoped read-only tools
│     └─ common/              guards, decorators, audit interceptor, date helpers
└─ apps/web/                  React + TypeScript + Vite + Tailwind
   ├─ Dockerfile              production web image
   ├─ .dockerignore           web Docker build exclusions
   ├─ nginx.conf              static files and /api reverse proxy
   └─ src/
      ├─ components/          layout, UI primitives, assistant widget
      ├─ lib/                 axios client, auth store, formatters
      └─ pages/               one page per screen
```

**Access control** is applied on the server, in the query itself. A teacher's request for students is filtered to the sections they are allotted plus the section they are class teacher of. Hiding menu items is only cosmetic; the API refuses out-of-scope reads regardless of what the browser asks for.

**Audit** is written by an interceptor on any handler marked `@Audit(...)`. Rows are only ever inserted, never updated or deleted.

**Business rules are configurable** in Setup rather than hard-coded: minimum attendance percentage, how long a teacher may edit attendance before needing an approved correction, whether approved leave counts as present, whether late assignment submission is allowed.

---

## 6. Rules already enforced

- Attendance cannot be marked for a future date, a Sunday, a declared holiday, or a date outside the academic year.
- Only the class teacher marks the day register; only the subject teacher — or an assigned substitute — marks a period.
- After the edit window closes, changing attendance needs an approved correction request.
- Approving leave automatically creates a "needs cover" row for every affected period, and deducts the leave balance.
- A substitute cannot be someone who is teaching elsewhere in that period, on leave, or already covering another class.
- Marks above the subject maximum are rejected; once results are processed, marks lock.
- Students and parents see nothing of a result until it is published.
- Receipt numbers are gapless; payments are applied to the oldest unpaid installment; receipts are cancelled, never edited.
- A section cannot be admitted into beyond its sanctioned capacity.
- Five failed sign-ins lock an account for 15 minutes.

---

## 7. What is left for you

Deliberately not built, so you can take it from here:

- **File uploads** — assignment attachments and student photos currently take a URL. Add S3 or local disk storage.
- **Notifications** — the `Notice` model and the audience filter exist; SMS and email delivery is not wired.
- **PDF output** — report cards, receipts and the monthly register render on screen; the print path uses the browser. Add a server-side PDF if the client wants an exact format.
- **Year rollover** — promotion of a whole class to the next year.
- **Biometric or RFID attendance import.**
- **Tests** — no test suite is included.

Both apps run with TypeScript `strict` off to keep the first build clean. Turn it on gradually as you harden things.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `Can't reach database server` | `docker compose up -d`, then check `DATABASE_URL` in `apps/api/.env` |
| `@prisma/client did not initialize` | `cd apps/api && npx prisma generate` |
| Web shows 401 and bounces to login | The API is not running, or the token expired — sign in again |
| Seed fails halfway | `npx prisma db push --force-reset && npm run seed` |
| Assistant says "offline mode" | Expected without `ANTHROPIC_API_KEY`; it still answers from the database |
| Port already in use | Change `PORT` in `apps/api/.env` and the proxy target in `apps/web/vite.config.ts` |
