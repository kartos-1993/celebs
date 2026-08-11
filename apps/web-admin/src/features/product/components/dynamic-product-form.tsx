import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useFormContext, type Control, type FieldValues } from 'react-hook-form';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';
import { FileText, ImageIcon, Package, Palette, Ruler, type LucideIcon } from 'lucide-react';
import type { FieldSpec } from '../types';
import { uiTypeRegistry } from '../fields/ui-registry';

export interface DynamicProductFormHandle {
  /** Switches to the tab owning the anchor and scrolls it into view.
   *  Returns false when the anchor is not part of the dynamic form. */
  scrollToSection: (anchorId: string) => boolean;
}

interface DynamicProductFormProps {
  catId?: string;
  schemaFields: FieldSpec[];
  isSchemaLoading?: boolean;
  schemaError?: Error | null;
  onValuesChange?: (values: Record<string, unknown>, sectionKey: string) => void;
}

type TabId = 'details' | 'media' | 'sale' | 'package' | 'termcondition';

interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
  groups: string[];
  /** Matches the anchorIds produced by buildSidebarSections. */
  anchorId: string;
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'details', label: 'Specifications', icon: Ruler, groups: ['details'], anchorId: 'product-section-details' },
  { id: 'media', label: 'Media & Swatches', icon: ImageIcon, groups: ['variant', 'media'], anchorId: 'product-section-base' },
  { id: 'sale', label: 'SKUs & Pricing', icon: Palette, groups: ['sale'], anchorId: 'product-section-sale' },
  { id: 'package', label: 'Shipping & Warranty', icon: Package, groups: ['package'], anchorId: 'product-section-package' },
  { id: 'termcondition', label: 'Terms & Conditions', icon: FileText, groups: ['termcondition'], anchorId: 'product-section-termcondition' },
];

export const DynamicProductForm = forwardRef<DynamicProductFormHandle, DynamicProductFormProps>(
  function DynamicProductForm(
    { catId, schemaFields, isSchemaLoading = false, schemaError = null, onValuesChange },
    ref,
  ) {
    const form = useFormContext();
    const [activeTab, setActiveTab] = React.useState<TabId>('details');
    const [detailsExpanded, setDetailsExpanded] = React.useState(false);
    const appliedDefaultsRef = React.useRef<string | null>(null);

    const fields = React.useMemo(
      () => (Array.isArray(schemaFields) ? schemaFields : []),
      [schemaFields],
    );

    // Apply server-provided default values once per category
    React.useEffect(() => {
      if (!catId || appliedDefaultsRef.current === catId) return;
      const defaults: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (field.value !== undefined && field.value !== null) {
          defaults[field.name] = field.value;
        }
      });
      if (Object.keys(defaults).length > 0) {
        form.reset({ ...form.getValues(), ...defaults });
        Object.entries(defaults).forEach(([key, value]) => {
          const sectionKey = fields.find((field) => field.name === key)?.group ?? '';
          onValuesChange?.({ [key]: value }, sectionKey);
        });
      }
      appliedDefaultsRef.current = catId;
    }, [catId, fields, form, onValuesChange]);

    const grouped = React.useMemo(() => {
      const acc: Record<string, FieldSpec[]> = {};
      fields.forEach((field) => {
        const key = field.group || 'details';
        (acc[key] = acc[key] || []).push(field);
      });
      return acc;
    }, [fields]);

    const visibleTabs = React.useMemo(
      () => TAB_CONFIG.filter((tab) => tab.groups.some((g) => (grouped[g] || []).length > 0)),
      [grouped],
    );

    // Keep the active tab valid when the schema changes
    React.useEffect(() => {
      if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
        setActiveTab(visibleTabs[0].id);
      }
    }, [visibleTabs, activeTab]);

    // ── Imperative scroll API (tab-aware) ─────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        scrollToSection: (anchorId: string) => {
          const tab = TAB_CONFIG.find((t) => t.anchorId === anchorId);
          if (!tab || !visibleTabs.some((t) => t.id === tab.id)) return false;
          setActiveTab(tab.id);
          // Wait one frame so the newly-active tab content is mounted
          window.requestAnimationFrame(() => {
            document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
          return true;
        },
      }),
      [visibleTabs],
    );

    // ── Change propagation (name/brand sync consumed by the parent) ───────
    const nameToGroup = React.useMemo(() => {
      const map: Record<string, string> = {};
      fields.forEach((field) => {
        map[field.name] = field.group || 'details';
      });
      return map;
    }, [fields]);

    const getValueAtPath = useCallback((obj: Record<string, unknown>, path: string): unknown => {
      if (!obj || !path) return undefined;
      if (path in obj) return obj[path];
      const keys = path.split('.');
      let current: unknown = obj;
      for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }
        current = (current as Record<string, unknown>)[key];
      }
      return current;
    }, []);

    const resolveFieldName = useCallback(
      (path: string): string => {
        if (nameToGroup[path]) return path;
        const rootKey = path.split('.')[0];
        if (nameToGroup[rootKey]) return rootKey;
        return path;
      },
      [nameToGroup],
    );

    React.useEffect(() => {
      if (!form) return;
      const subscription = form.watch((values, { name: changedName }) => {
        if (!changedName) return;
        const fieldName = resolveFieldName(changedName);
        const sectionKey = nameToGroup[fieldName];
        if (!sectionKey) return;
        onValuesChange?.(
          { [changedName]: getValueAtPath(values as Record<string, unknown>, changedName) },
          sectionKey,
        );
      });
      return () => subscription.unsubscribe();
    }, [form, getValueAtPath, nameToGroup, onValuesChange, resolveFieldName]);

    // ── Guards ─────────────────────────────────────────────────────────────
    if (!catId) {
      return (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400">
          Select a category to continue.
        </div>
      );
    }
    if (isSchemaLoading) {
      return (
        <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 text-sm text-gray-500 shadow-xs dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-400">
          Loading category specifications...
        </div>
      );
    }
    if (schemaError) {
      return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          Failed to load category specifications. {schemaError.message}
        </div>
      );
    }

    const renderFieldNodes = (list: FieldSpec[]) =>
      list.map((field) => {
        const Comp = uiTypeRegistry[field.uiType];
        if (!Comp) return null;
        const wide = field.uiType === 'ColorMeta' || field.uiType === 'SizeMeasurementsTable';
        return (
          <div key={field.name} className={wide ? 'col-span-full' : undefined}>
            <Comp field={field} control={form.control} />
          </div>
        );
      });

    const activeConfig = visibleTabs.find((tab) => tab.id === activeTab) ?? visibleTabs[0];

    return (
      <div className="space-y-6">
        {/* Tab bar */}
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-800">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeConfig?.id === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active tab content — wrapper carries the checklist anchor id */}
        {activeConfig ? (
          <div id={activeConfig.anchorId} className="scroll-mt-24">
            {activeConfig.id === 'details' ? (
              <DetailsSection
                fields={grouped.details || []}
                control={form.control}
                isOpen={detailsExpanded}
                onOpenChange={setDetailsExpanded}
              />
            ) : activeConfig.id === 'media' ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {renderFieldNodes([...(grouped.variant || []), ...(grouped.media || [])])}
              </div>
            ) : (
              <div className="space-y-6">
                {renderFieldNodes(activeConfig.groups.flatMap((g) => grouped[g] || []))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400">
            This category has no additional fields configured.
          </div>
        )}
      </div>
    );
  },
);

function DetailsSection({
  fields,
  control,
  isOpen,
  onOpenChange,
}: {
  fields: FieldSpec[];
  control: Control<FieldValues>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const first = fields.slice(0, 6);
  const rest = fields.slice(6);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {first.map((field) => {
          const Comp = uiTypeRegistry[field.uiType];
          if (!Comp) return null;
          return (
            <div key={field.name}>
              <Comp field={field} control={control} />
            </div>
          );
        })}
      </div>
      {rest.length > 0 ? (
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CollapsibleContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            {rest.map((field) => {
              const Comp = uiTypeRegistry[field.uiType];
              if (!Comp) return null;
              return (
                <div key={field.name}>
                  <Comp field={field} control={control} />
                </div>
              );
            })}
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary">
              {isOpen ? 'Show Less Specifications' : `Show ${rest.length} More Specifications`}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      ) : null}
    </div>
  );
}