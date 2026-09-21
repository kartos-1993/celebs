# Phased Refactoring & Commit Protocol

## 1. Incremental Step-by-Step Refactoring & Commit Mandate

- Never dump massive, unreviewable multi-file changes across the entire monorepo all at once.
- Execute refactoring in discrete, logical steps (e.g. Step 1: `packages/shared-types`, Step 2: `apps/api`, Step 3: `apps/web-admin`, Step 4: `apps/mobile`).
- After completing each logical step:
  1. Run localized typechecks and unit/integration tests to verify correctness.
  2. Commit the changes for that step with a clear, human-friendly git commit message.
  3. Provide a summary of completed changes for review before moving to the next step.

## 2. Test Execution & Isolation

- Single Subshell Env Wrapping: Package `package.json` test scripts must wrap chained commands inside a single subshell environment scope (`dotenv -e .env.test -- sh -c "..."` or explicit per-command `dotenv -e`) so `vitest` and `prisma db push` run against the exact same database.
- Local Isolated Database Only: Integration/unit tests MUST run strictly against local PostgreSQL (`postgresql://postgres:celebs@localhost:5432/celebs_test`). Testing against remote cloud databases is strictly prohibited.
- Stubs & Mocks: Stubs/mocks for S3 presigned URLs without requiring external cloud connectivity.

## 3. Test-Driven Development (TDD) & Resource Optimization Workflow

1. **Step 1 - Plan Test Matrix**: Define every requirement, boundary condition, and vulnerability as an explicit test scenario before writing or touching implementation code.
2. **Step 2 - Red (Failing Test First)**: Author the automated test case in the appropriate `__tests__` directory. Run the test suite and verify it FAILS for the expected reason.
3. **Step 3 - Green (Minimal Implementation)**: Write the cleanest, most minimal code to pass the test. Follow fail-closed principles and input validation at the boundary.
4. **Step 4 - Resource & Cost Verification**:
   - Verify zero unindexed scans in PostgreSQL.
   - Preserve port 6543 connection pool: Zero direct queries or unnecessary roundtrips inside business logic.
   - Leverage Redis-first caching to eliminate avoidable database hits.
   - Reject bad inputs at the router level so invalid requests consume 0ms of database CPU/pool resources.
5. **Step 5 - Refactor & Commit**: Ensure all tests remain green, run localized typechecks (`tsc --noEmit`), and commit cleanly with conventional commit format.
