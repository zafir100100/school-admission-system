# AI_USAGE.md

## AI tools used

**ChatGPT (OpenAI)** was used as a coding and documentation assistant during development of the School Admission System. It helped draft implementation code, suggest configuration changes, explain errors, and prepare project documentation. AI-generated output was treated as a starting point requiring review rather than as automatically correct.

## Where AI was used

| Area | How ChatGPT was used |
| --- | --- |
| ASP.NET Core backend | Drafted the API structure, admission class and hold models, validation, confirmation/cancellation flows, and expiration handling. |
| PostgreSQL | Suggested the database schema, indexes, and a transaction/row-locking approach to prevent oversubscription. |
| React frontend | Generated the initial interface and later revised it to use Bengali labels and the four screens described in section 1.3 of the assignment. |
| Docker | Drafted the Dockerfiles and Compose services for PostgreSQL, backend, and frontend; helped troubleshoot Docker Desktop and DBeaver connectivity. |
| Testing and documentation | Drafted API integration/concurrency tests and supporting README/assumptions documentation. |

## AI mistakes, how they were identified, and corrections

1. **Incomplete UI requirements and language.** The initial React UI did not fully reflect the Bengali-language requirements in assignment section 1.3. Comparing the generated interface with the assignment revealed the missing/incorrect presentation. The frontend was revised to include Bengali text, separate class-creation, class-list, application, and my-applications views, a student birth-registration-number field, seat counts, hold countdown, simulated payment, and cancellation actions.

2. **Incorrect PostgreSQL host port in a revised package.** While helping configure DBeaver access, ChatGPT repeatedly changed the host-side port to `5432`, although the requested mapping was `127.0.0.1:5433:5432`. The mismatch was caught by reviewing the Compose configuration and the user's explicit request. The configuration was corrected so DBeaver uses **localhost:5433**, while PostgreSQL and the backend continue using port **5432 inside Docker**.

3. **Initial Docker connection diagnosis.** The first `docker compose up` attempts failed because the Docker Desktop Linux engine was unavailable, not because the application failed to compile. Reviewing the command output separated the Docker environment issue from application code. A later Docker log showed successful image builds, PostgreSQL initialization, table creation, and .NET/Nginx startup.

## Verification and limitations

- The supplied Docker log confirms successful image builds and startup of PostgreSQL, ASP.NET Core, and Nginx/React. It does **not** by itself prove that all application workflows are correct.
- The PostgreSQL schema and indexes were created according to the startup log.
- API behavior, UI interactions, hold expiry, and concurrency safety should be checked using the provided automated tests and manual browser testing before submission.
- A successful DBeaver connection should be verified separately after the port change; it is not established by the earlier screenshots.

## Human review and decisions

The assignment requirements and Bengali UI expectations were reviewed against the generated output. The PostgreSQL port mapping was explicitly specified as `127.0.0.1:5433:5432`, and the AI-generated configuration was corrected accordingly. The developer remains responsible for running the tests, reviewing the source code, validating results, and making final submission decisions.