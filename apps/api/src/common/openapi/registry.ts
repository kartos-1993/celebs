import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

import { z } from '@celebs/shared-types';

// Extend zod to allow .openapi() calls
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();
