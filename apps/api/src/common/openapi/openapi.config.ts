import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { config } from '../../config/app.config';
import { registry } from './registry';

// Register Security Scheme for Bearer Token
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Provide JWT Bearer Token to access protected endpoints',
});

// Register Security Scheme for Cookies (Session)
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'connect.sid',
  description: 'Express session ID cookie',
});

// Import endpoints to register them in the registry
import './auth.openapi';

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Celebs API',
      description: 'API documentation for the Celebs E-Commerce platform backend service.',
    },
    servers: [
      {
        url: config.BASE_PATH || '/api/v1',
        description: `${config.NODE_ENV} environment base path`,
      },
    ],
  });
}
