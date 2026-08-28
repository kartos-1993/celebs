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
        'MANDATORY PRE-FLIGHT (.agents/AGENTS.md): 1) web-admin & mobile: max 150 lines/tsx, no inline mutations/apiClient in UI, use <RESOURCE>_QUERY_KEYS factory. 2) api: Clean Architecture (routes->controller->service->repo), zero Prisma in controllers, port 6543 pool. 3) REST: standard verbs (GET/POST/PUT/PATCH/DELETE) and plural nouns.',
    },
  ],
};

process.stdout.write(JSON.stringify(message));
