import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flattenFormErrors, formatFieldLabel, focusFirstError } from '../form-focus';

describe('form-focus utility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('flattenFormErrors', () => {
    it('should flatten nested react hook form errors correctly', () => {
      const errors = {
        name: { message: 'Product name is required' },
        sizes: [
          {
            bodyMeasurements: [
              { value: { message: 'Bust measurement is required' } },
            ],
          },
        ],
      };

      const flat = flattenFormErrors(errors);
      expect(flat).toEqual([
        { path: 'name', message: 'Product name is required' },
        { path: 'sizes.0.bodyMeasurements.0.value', message: 'Bust measurement is required' },
      ]);
    });

    it('should return empty array when errors are empty', () => {
      expect(flattenFormErrors({})).toEqual([]);
    });
  });

  describe('formatFieldLabel', () => {
    it('should format body measurement paths nicely', () => {
      expect(formatFieldLabel('sizes.0.bodyMeasurements.0.value')).toBe('Body Measurements');
      expect(formatFieldLabel('sizes.1.productMeasurements.2.value')).toBe('Product Measurements');
      expect(formatFieldLabel('sku.variants.Color.Red.stock')).toBe('Price & Stock (SKU)');
      expect(formatFieldLabel('name')).toBe('Product Name');
      expect(formatFieldLabel('price')).toBe('Regular Price');
      expect(formatFieldLabel('discountedPrice')).toBe('Special Price');
      expect(formatFieldLabel('categoryId')).toBe('Category');
    });
  });

  describe('focusFirstError', () => {
    it('should query element by name and call focus', () => {
      const input = document.createElement('input');
      input.setAttribute('name', 'sizes.0.bodyMeasurements.0.value');
      input.focus = vi.fn();
      input.scrollIntoView = vi.fn();
      document.body.appendChild(input);

      const errors = {
        sizes: [
          {
            bodyMeasurements: [
              { value: { message: 'Bust is required' } },
            ],
          },
        ],
      };

      const result = focusFirstError(errors);
      expect(result).toBeDefined();
      expect(result?.path).toBe('sizes.0.bodyMeasurements.0.value');
      expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(input.focus).toHaveBeenCalled();
    });

    it('should fallback to section anchor when element not in DOM', () => {
      const section = document.createElement('div');
      section.id = 'product-section-sale';
      section.scrollIntoView = vi.fn();
      document.body.appendChild(section);

      const errors = {
        custom_field: { message: 'Custom field is invalid' },
      };

      const result = focusFirstError(errors, 'product-section-sale');
      expect(result).toBeDefined();
      expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });
});
