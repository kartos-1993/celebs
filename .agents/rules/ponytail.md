# Ponytail Anti-Overengineering Mandates

## 1. The Laziness Ladder (Order of Priority)

Before adding new code, classes, or abstractions, evaluate the ladder rungs in order. Stop at the first rung that satisfies the requirement:

1. **Does this need to exist at all? (YAGNI)**: Speculative need = skip it. During active development, never build backward-compatibility shims, dual-format parsers, or "just in case" abstractions.
2. **Already in this codebase?**: Reuse existing helpers, utilities, Prisma repositories, or FSD slices. Never re-implement what already lives a few directories over.
3. **Does the standard library / Node.js do it?**: Use native runtime features (e.g. `crypto.randomUUID()`, `URL`, `Array.prototype` methods) before pulling external libraries or writing custom utilities.
4. **Does a native platform feature cover it?**: Standard HTML primitives over heavy custom widgets, CSS over JavaScript animation, PostgreSQL constraints and indices (`@@index`, `@unique`, `CHECK`) over complex application-level lock checks.
5. **Does an already-installed dependency solve it?**: Reuse packages present in `package.json` (`lodash`, `zod`, `date-fns`). Never add new dependencies for something that takes a few lines.
6. **Can it be one clean line?**: If yes, keep it one line.
7. **Only then**: Write the minimum code that cleanly works.

## 2. Zero Defensive Fallback Cascades

- **Fail Fast, Fix at Source**: Never write defensive multi-tier chaining like `response.data?.data?.data ?? response.data?.data ?? []`.
- If an endpoint or service returns an unexpected shape, fix the endpoint at the source. Never mask backend contract drift with client-side defensive fallbacks.

## 3. Deletion Over Addition

- The best code is code that was deleted or never written.
- When refactoring, eliminate dead imports (`import prisma from '@/config/db.prisma'`), dead controller actions, and unused helper functions.
- Boring, direct code always wins over clever, deeply-nested abstractions that require 3am debugging.

## 4. Root-Cause Fixes Over Symptom Patches

- Never patch only the single caller mentioned in an error report. Trace all callers using the knowledge graph or search, and fix the contract at the root source.
- One solid guard at the source beats patches across five calling components.
