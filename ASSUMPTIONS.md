# Assumptions and rationale

1. **Class represents a class/shift combination.** Each shift has a separate capacity, matching the brief's example.
2. **Student identity:** exactly 17 ASCII digits in `X-Student-Id`, entered in the UI and retained in browser local storage for convenience. This is not secure authentication and must be replaced with verified identity for production.
3. **Admin access:** the admin screen and POST `/classes` are public because the assignment says no login. Real deployments need role-based authorization.
4. **Hold duration:** default 600 seconds from the server's UTC clock; configurable via `HOLD_DURATION_SECONDS`. The server decides expiry, not the browser.
5. **Expired holds:** an expired HELD record is returned as `EXPIRED` but remains stored as HELD; availability calculations ignore it. This avoids requiring a background worker while preserving history. A later request for the same class can create a new hold.
6. **One application per student per class:** at most one unexpired HELD or CONFIRMED record. CANCELLED/EXPIRED history is retained. A student may apply to different classes.
7. **Confirmation:** the fee button simulates successful payment; confirmation is idempotent, so repeating a successful confirmation does not increase seat counts.
8. **Cancellation:** a pending hold may be cancelled; a confirmed admission cannot be cancelled through this endpoint. A second cancellation is treated as successful (204).
9. **Read access to individual hold:** GET `/holds/{holdId}` follows the PDF contract and does not require a student header. Its random ID is hard to guess, but this is not adequate privacy protection in production.
10. **First come, first served:** allocation order is the order in which requests acquire the PostgreSQL class-row lock, not client-side timestamps. This guarantees capacity correctness but not a globally fair arrival order across the internet.
11. **Database schema:** `EnsureCreated` initializes tables on first boot; real production schema changes should use versioned EF Core migrations.
12. **Persistence:** a named PostgreSQL volume preserves data after restart and `docker compose down` (without `-v`).
13. **Two API processes:** PostgreSQL row locks are shared across connections and processes, so the allocation invariant does not rely on in-memory locks.
14. **Error handling:** invalid input returns 400, missing resources 404, no capacity/duplicate/invalid transition 409, wrong student 403, and successful cancellation 204.
