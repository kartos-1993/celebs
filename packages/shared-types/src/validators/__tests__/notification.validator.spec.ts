import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import {
  broadcastPayloadSchema,
  notificationPointerDataSchema,
  registerPushTokenSchema,
} from '../notification.validator';

describe('Notification Zod Validator Unit Tests (TDD - Red Phase)', () => {
  describe('registerPushTokenSchema', () => {
    it('should pass valid Expo push token with supported platform', () => {
      const payload = {
        pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
      };

      const parsed = registerPushTokenSchema.parse(payload);
      expect(parsed.pushToken).toBe('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
      expect(parsed.platform).toBe('android');
    });

    it('should default platform to android if omitted', () => {
      const payload = {
        pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      };

      const parsed = registerPushTokenSchema.parse(payload);
      expect(parsed.platform).toBe('android');
    });

    it('should throw ZodError on invalid push token prefix', () => {
      const payload = {
        pushToken: 'invalid-token-format',
      };

      expect(() => registerPushTokenSchema.parse(payload)).toThrow(ZodError);
    });

    it('should throw ZodError on unsupported platform', () => {
      const payload = {
        pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'unsupported-os',
      };

      expect(() => registerPushTokenSchema.parse(payload)).toThrow(ZodError);
    });
  });

  describe('broadcastPayloadSchema', () => {
    it('should pass valid broadcast payload for all users', () => {
      const payload = {
        title: 'Dashain Mega Sale! 🛍️',
        body: 'Flat 50% off on all items for the next 24 hours.',
        targetAudience: 'ALL',
        deepLinkUrl: '/promotions/dashain-sale',
      };

      const parsed = broadcastPayloadSchema.parse(payload);
      expect(parsed.title).toBe('Dashain Mega Sale! 🛍️');
      expect(parsed.targetAudience).toBe('ALL');
    });

    it('should throw ZodError when title or body is empty', () => {
      const payload = {
        title: '',
        body: '',
        targetAudience: 'CUSTOMERS',
      };

      expect(() => broadcastPayloadSchema.parse(payload)).toThrow(ZodError);
    });

    it('should throw ZodError on invalid targetAudience enum', () => {
      const payload = {
        title: 'Sale Alert',
        body: 'Discount available now',
        targetAudience: 'INVALID_SEGMENT',
      };

      expect(() => broadcastPayloadSchema.parse(payload)).toThrow(ZodError);
    });
  });

  describe('notificationPointerDataSchema (4KB Limit & PII Protection)', () => {
    it('should pass lightweight pointer metadata (<4KB)', () => {
      const payload = {
        orderId: 'c6c8e310-91c2-48df-9f37-1234567890ab',
        status: 'SHIPPED',
        url: '/orders/c6c8e310-91c2-48df-9f37-1234567890ab',
      };

      const parsed = notificationPointerDataSchema.parse(payload);
      expect(parsed.orderId).toBe('c6c8e310-91c2-48df-9f37-1234567890ab');
    });

    it('should reject bloated payload exceeding 4096 bytes', () => {
      const massivePayload = {
        orderId: '123',
        bloatedDump: 'x'.repeat(4500),
      };

      expect(() => notificationPointerDataSchema.parse(massivePayload)).toThrow(ZodError);
    });
  });
});
