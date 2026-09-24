---
name: Financial flow verification
description: Environment constraint for validating payout and ledger changes in this project.
---

The configured PostgreSQL connection may be reachable while still lacking the imported project's schema. In that state, financial tests fail before exercising application logic. The repository's local pg-mem engine is the reliable isolated test backend when the database connection variables are intentionally unset for the test process; live order reconciliation must wait until the real schema/data is available.

**Why:** A test run against a schema-less database reports missing-table errors and cannot distinguish environment setup failure from a financial logic regression.

**How to apply:** Keep live database verification separate from local regression tests. Never claim a specific production order was reconciled based only on the pg-mem suite.

For transactional tests, the local `MemoryPool` must preserve `BEGIN`/`ROLLBACK` semantics explicitly because pg-mem's default PostgreSQL adapter executes queries against root state. Use its backup/restore mechanism for rollback behavior.

**Why:** Without this adapter-level handling, a failed multi-step request can appear atomic in PostgreSQL but leave partial records in local tests.

**How to apply:** When adding transaction coverage, run it against the local fallback as well as PostgreSQL and treat any divergence as a persistence bug, not a test limitation.