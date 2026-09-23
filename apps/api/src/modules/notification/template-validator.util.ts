import type { NotificationSeverity } from '@celebs/shared-types';

export interface NotificationTemplateDefinition {
  title: string;
  body: string;
  severity: NotificationSeverity;
  requiredVariables?: string[];
  allowedVariables?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const MAX_TITLE_LENGTH = 100;
export const MAX_BODY_LENGTH = 250;

/**
 * Validates that a notification template adheres to payload size constraints
 * and includes all mandatory placeholder variables.
 */
export function validateNotificationTemplate(
  template: NotificationTemplateDefinition,
): ValidationResult {
  const errors: string[] = [];

  if (!template.title || template.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  } else if (template.title.length > MAX_TITLE_LENGTH) {
    errors.push(`Title exceeds maximum allowed length of ${MAX_TITLE_LENGTH} characters`);
  }

  if (!template.body || template.body.trim().length === 0) {
    errors.push('Body cannot be empty');
  } else if (template.body.length > MAX_BODY_LENGTH) {
    errors.push(`Body exceeds maximum allowed length of ${MAX_BODY_LENGTH} characters`);
  }

  if (template.requiredVariables && template.requiredVariables.length > 0) {
    const combinedText = `${template.title} ${template.body}`;
    for (const reqVar of template.requiredVariables) {
      const placeholder = `{{${reqVar}}}`;
      if (!combinedText.includes(placeholder)) {
        errors.push(`Missing required variable: ${placeholder} in title or body`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
