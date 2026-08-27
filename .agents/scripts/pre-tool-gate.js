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
