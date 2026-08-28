const fs = require('fs');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

const input = readStdin();
let payload = {};
try {
  payload = JSON.parse(input);
} catch {
  // If parsing fails, allow by default
  process.stdout.write(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

const toolCall = payload.toolCall || {};
const args = toolCall.args || {};
const targetFile = (args.TargetFile || '').replace(/\\/g, '/');
const content =
  args.CodeContent || (args.ReplacementChunks ? JSON.stringify(args.ReplacementChunks) : '');

// Exclude tests from strict line limits
const isTestFile =
  targetFile.includes('__tests__') ||
  targetFile.includes('.spec.') ||
  targetFile.includes('.test.');

// Gate 1: Check apps/web-admin invariants
if (targetFile.includes('apps/web-admin')) {
  // Check TSX file length limit (max 200 lines)
  if (targetFile.endsWith('.tsx') && !isTestFile && content) {
    const lineCount = content.split('\n').length;
    if (lineCount > 200) {
      process.stdout.write(
        JSON.stringify({
          decision: 'deny',
          reason: `BLOCKED by apps/web-admin/AGENTS.md: Component exceeds 200 lines (${lineCount} lines). Decompose into FSD sub-components.`,
        }),
      );
      process.exit(0);
    }
  }

  // Check inline useMutation inside UI components (must be in hooks/)
  if (targetFile.includes('/components/') && !isTestFile && content.includes('useMutation(')) {
    process.stdout.write(
      JSON.stringify({
        decision: 'deny',
        reason:
          'BLOCKED by apps/web-admin/AGENTS.md: Raw inline useMutation found in components/. Extract to hooks/use-*-mutations.ts.',
      }),
    );
    process.exit(0);
  }
}

// Gate 2: Check apps/mobile invariants
if (targetFile.includes('apps/mobile')) {
  // Check TSX file length limit (max 200 lines)
  if (targetFile.endsWith('.tsx') && !isTestFile && content) {
    const lineCount = content.split('\n').length;
    if (lineCount > 200) {
      process.stdout.write(
        JSON.stringify({
          decision: 'deny',
          reason: `BLOCKED by apps/mobile/AGENTS.md: Component exceeds 200 lines (${lineCount} lines). Decompose into sub-components.`,
        }),
      );
      process.exit(0);
    }
  }

  // Check inline mutation or raw API calls in UI components/screens
  const isMobileUI = targetFile.includes('/components/') || targetFile.includes('/app/');
  if (
    isMobileUI &&
    !isTestFile &&
    (content.includes('useMutation(') ||
      content.includes('apiClient.post(') ||
      content.includes('apiClient.put(') ||
      content.includes('apiClient.delete('))
  ) {
    process.stdout.write(
      JSON.stringify({
        decision: 'deny',
        reason:
          'BLOCKED by apps/mobile/AGENTS.md: Inline mutations/API mutations found in UI. Extract to features/<domain>/hooks/ with a query key factory.',
      }),
    );
    process.exit(0);
  }
}

// Gate 3: Check apps/api Clean Architecture
if (targetFile.includes('apps/api/src/modules')) {
  // Controllers must not call Prisma directly
  if (targetFile.includes('.controller.ts') && !isTestFile && content.includes('prisma.')) {
    process.stdout.write(
      JSON.stringify({
        decision: 'deny',
        reason:
          'BLOCKED by apps/api/AGENTS.md: Direct Prisma access in controller. Move database logic to *.repository.ts or *.service.ts.',
      }),
    );
    process.exit(0);
  }
}

// Gate 2: Check strict type safety across entire repo (no 'as any' in production code)
if (
  !isTestFile &&
  (content.includes('as any') || content.includes(': any') || content.includes('@ts-ignore'))
) {
  process.stdout.write(
    JSON.stringify({
      decision: 'deny',
      reason:
        "BLOCKED by AGENTS.md: Explicit 'any' and '@ts-ignore' are strictly forbidden. Use explicit interfaces or Zod parsing.",
    }),
  );
  process.exit(0);
}

// Default: allow
process.stdout.write(JSON.stringify({ decision: 'allow' }));
