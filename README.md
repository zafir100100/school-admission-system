# School Admission System

A Dockerized first-come, first-served school admission application using **ASP.NET Core 8**, **PostgreSQL 16**, **React 18**, and **Vite**.

## Quick start

1. Install Docker Desktop and enable Docker Compose.
2. From the repository root run `docker compose up --build`.
3. Open the frontend at **http://localhost:3000** and the API at **http://localhost:8080**.
4. In **Manage classes**, create a class (for example, Class 6 - Morning Shift, 120 seats).
5. Enter a 17-digit student birth registration number, apply for a seat, and use **My applications** to confirm or cancel.

No .NET, Node.js or PostgreSQL installation is required outside Docker. Database data survives container restarts via the `postgres_data` volume. To stop: `docker compose down`. Do not use `docker compose down -v` unless intentionally deleting all admissions.

## Configuration

Copy `.env.example` to `.env` to customize `POSTGRES_PASSWORD`, `HOLD_DURATION_SECONDS` (default 600), `VITE_API_URL` (frontend API endpoint, set at image build time), and `FRONTEND_ORIGIN`. After changing `VITE_API_URL`, rebuild the frontend with `docker compose up --build`. The backend listens on port **8080**.

## API contract

| Method | Path | Purpose |
|---|---|---|
| POST | `/classes` | Create class `{ "name": "Class 6 - Morning Shift", "totalSeats": 120 }` |
| GET | `/classes` | List classes and available/held/confirmed seat counts |
| GET | `/classes/{classId}` | Class details and counts |
| POST | `/classes/{classId}/holds` | Reserve a seat (requires `X-Student-Id`) |
| GET | `/holds/{holdId}` | Get current application status |
| POST | `/holds/{holdId}/confirm` | Simulated fee payment and confirmation (requires `X-Student-Id`) |
| DELETE | `/holds/{holdId}` | Cancel pending application (requires `X-Student-Id`) |
| GET | `/me/holds` | All applications belonging to the student (requires `X-Student-Id`) |

Student ID is exactly 17 numeric characters. All responses use JSON except successful DELETE (204). No authentication is specified by the assignment; see `ASSUMPTIONS.md` for security limitations.

## Concurrency design

The API uses a PostgreSQL `SELECT ... FOR UPDATE` row-level lock on the class inside a database transaction before counting occupied seats and creating a hold. Requests for the same class serialize, including when multiple backend containers are running. Confirm and cancel operations lock the same class row before mutation. Expired holds are excluded from occupied counts, so seats are available again without a scheduled cleanup process. The UI polls every 5 seconds and refreshes on actions.

## Testing

Start Docker Compose, then run the integration test script from a shell with Python 3 installed: `python3 tests/integration.py`. It covers creation, seat limits, expiry, cancellation, idempotent confirmation, student isolation, and concurrent hold requests. Tests create their own uniquely named classes and leave those records in the local database. See `tests/README.md`.

## Architecture

`React UI (localhost:3000) → ASP.NET API (localhost:8080) → PostgreSQL (Docker network)`.

- `backend/SchoolAdmission.Api`: Minimal APIs, EF Core models, PostgreSQL transactions
- `frontend`: React SPA and nginx container
- `tests`: API integration and concurrency checks
- `ASSUMPTIONS.md`: interpretations of unspecified behavior
- `AI_USAGE.md`: AI disclosure and verification checklist

## Notes

The administrator panel is intentionally unauthenticated because the brief explicitly excludes login. This is a demonstration, not a production-ready identity or payment solution. The payment button simulates a successful payment; no real money is transferred. The PDF assignment is not included in this repository.
