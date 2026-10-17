import React, { useImperativeHandle } from 'react';
import { useFormContext } from 'react-hook-form';

import type { FieldSpec } from '../types';

import {
  buildNameToGroup,
  collectServerDefaults,
  getValueAtPath,
  groupFieldsByGroup,
  resolveFieldName,
  type ServerDefaultEntry,
} from './dynamic-form-helpers';

export interface DynamicProductFormHandle {
  /** Scrolls the section owning the anchor into view.
   *  Returns false when the anchor is not found in the DOM. */
  scrollToSection: (anchorId: string) => boolean;
}

interface UseDynamicProductFormParams {
  catId?: string;
  schemaFields: FieldSpec[];
  onValuesChange?: (values: Record<string, unknown>, sectionKey: string) => void;
  ref: React.ForwardedRef<DynamicProductFormHandle>;
}

/** Applies one server default and reports it to the parent. */
function applyServerDefault(
  form: ReturnType<typeof useFormContext>,
  entry: ServerDefaultEntry,
  onValuesChange: UseDynamicProductFormParams['onValuesChange'],
): void {
  form.setValue(entry.name, entry.value, { shouldDirty: false, shouldValidate: false });
  onValuesChange?.({ [entry.name]: entry.value }, entry.group);
}

export function useDynamicProductForm({
  catId,
  schemaFields,
  onValuesChange,
  ref,
}: UseDynamicProductFormParams) {
  const form = useFormContext();
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const appliedDefaultsRef = React.useRef<string | null>(null);

  const fields = React.useMemo(
    () => (Array.isArray(schemaFields) ? schemaFields : []),
    [schemaFields],
  );

  React.useEffect(() => {
    if (!catId || appliedDefaultsRef.current === catId) return;
    const defaults = collectServerDefaults(fields, form.getValues() || {});
    for (const entry of defaults) {
      applyServerDefault(form, entry, onValuesChange);
    }
    if (defaults.length > 0) {
      void form.trigger(defaults.map((entry) => entry.name));
    }
    appliedDefaultsRef.current = catId;
  }, [catId, fields, form, onValuesChange]);

  const grouped = React.useMemo(() => groupFieldsByGroup(fields), [fields]);

  const detailsFields = React.useMemo(() => grouped.details || [], [grouped.details]);
  const restDetailsFields = React.useMemo(() => detailsFields.slice(6), [detailsFields]);

  React.useEffect(() => {
    if (restDetailsFields.length === 0 || detailsExpanded) return;
    const hasErrorInCollapsed = restDetailsFields.some((field) =>
      Boolean(form.formState.errors[field.name]),
    );
    if (hasErrorInCollapsed) {
      setDetailsExpanded(true);
    }
  }, [detailsExpanded, form.formState.errors, restDetailsFields]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToSection: (anchorId: string) => {
        if (anchorId === 'product-section-details') {
          setDetailsExpanded(true);
        }
        const element = document.getElementById(anchorId);
        if (!element) return false;
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      },
    }),
    [],
  );

  const nameToGroup = React.useMemo(() => buildNameToGroup(fields), [fields]);

  React.useEffect(() => {
    if (!form) return;
    const subscription = form.watch((values, { name: changedName }) => {
      if (!changedName) return;
      const fieldName = resolveFieldName(changedName, nameToGroup);
      const sectionKey = nameToGroup[fieldName];
      if (!sectionKey) return;
      onValuesChange?.(
        { [changedName]: getValueAtPath(values as Record<string, unknown>, changedName) },
        sectionKey,
      );
    });
    return () => subscription.unsubscribe();
  }, [form, nameToGroup, onValuesChange]);

  return {
    form,
    fields,
    grouped,
    detailsFields,
    detailsExpanded,
    setDetailsExpanded,
  };
}
