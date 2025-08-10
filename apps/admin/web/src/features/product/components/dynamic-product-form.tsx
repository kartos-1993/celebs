import React from 'react';
import { DynamicForm } from '../renderer/DynamicForm';
import type { FieldSpec } from '../renderer/UiRegistry';
import CollapsibleFormSection from './collapsible-form-section';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ImageIcon, Palette, Ruler } from 'lucide-react';
import { ProductAPI } from '@/lib/axios-client';

export default function DynamicProductForm({ catId }: { catId: string }) {
  const [fields, setFields] = React.useState<FieldSpec[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!catId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await ProductAPI.get('/product-render', { params: { catId, locale: 'en_US' } });
        const next = res.data?.data?.data ?? res.data?.data ?? [];
        setFields(next);
      } catch (e: any) {
        setError(e?.message || 'Failed to load form schema');
      } finally {
        setLoading(false);
      }
    })();
  }, [catId]);

  if (!catId) return <div className="text-sm text-gray-500">Select a category to continue.</div>;
  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!fields.length) return <div>No fields.</div>;

  // Group by field.group to loosely match the reference layout
  const groups: Record<string, FieldSpec[]> = {};
  for (const f of fields) {
    const g = f.group || 'basic';
    groups[g] = groups[g] || [];
    groups[g].push(f);
  }

  // Map to explicit tiles as in the reference
  const order: Array<{ key: string; title: string; desc?: string; icon?: any }> = [
    { key: 'base', title: 'Product Images', icon: <ImageIcon className="h-5 w-5 text-primary" /> },
    { key: 'details', title: 'Product Attributes', icon: <Palette className="h-5 w-5 text-primary" /> },
    { key: 'variant', title: 'Variants', icon: <Palette className="h-5 w-5 text-primary" /> },
    { key: 'sale', title: 'Price, Stock & Variants', icon: <Palette className="h-5 w-5 text-primary" /> },
    { key: 'package', title: 'Shipping & Warranty', icon: <Ruler className="h-5 w-5 text-primary" /> },
    { key: 'termcondition', title: 'Terms & Conditions' },
  ];

  return (
    <div className="space-y-6">
      {order.filter(({ key }) => groups[key]?.length).map(({ key, title, icon }) => (
        <CollapsibleFormSection
          key={key}
          title={title}
          description=""
          icon={icon}
          isValid={true}
          isRequired={false}
          defaultOpen={key === 'base'}
        >
          {key === 'details' ? (
            <Collapsible>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Fill more product specification to improve searchability</div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">Show More</Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <DynamicForm
                  fields={groups[key]}
                  onSubmit={(vals) => console.log('Submit section', key, vals)}
                />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <DynamicForm
              fields={groups[key]}
              onSubmit={(vals) => console.log('Submit section', key, vals)}
            />
          )}
        </CollapsibleFormSection>
      ))}
    </div>
  );
}
