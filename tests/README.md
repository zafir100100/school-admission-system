# API integration tests

With Docker Compose running, execute `python3 tests/integration.py` from the repository root. Python 3 is required **only for running this optional test script**, not to run the application.

The script checks invalid student IDs, class creation, duplicate holds, wrong-student confirmation, idempotent confirmation, confirmed-cancellation rejection, cancellation releasing a seat, student application listing, and a 40-request concurrency burst for a class with 3 seats. Exactly 3 holds must succeed and 37 must return 409.

To test expiry, set `HOLD_DURATION_SECONDS=2` in `.env`, restart the backend (`docker compose up -d --force-recreate backend`), create a class, apply, wait 3 seconds, and verify that the hold is EXPIRED and the seat is available. Restore the default duration afterward.

To test persistence, create and confirm an application, run `docker compose down`, then `docker compose up -d` and check the confirmed application still exists.

These are integration tests against a live API; they are not isolated unit tests. Each run creates uniquely named test classes and leaves records in the database.
