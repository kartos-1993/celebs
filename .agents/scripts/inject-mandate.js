const fs = require('fs');

// Read stdin (optional metadata)
try {
  fs.readFileSync(0, 'utf-8');
} catch {
  // ignore
}

const message = {
  injectSteps: [
    {
      ephemeralMessage:
        'MANDATORY PRE-FLIGHT: You are operating under .agents/AGENTS.md. For apps/web-admin, enforce max 150 lines per .tsx, no inline useMutation, FSD boundaries, and pure .ts mappers. For apps/api, enforce controller/service/repo boundaries and port 6543 pooling. Proposing monolithic files is strictly blocked.',
    },
  ],
};

process.stdout.write(JSON.stringify(message));
