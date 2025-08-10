import { useForm, FormProvider } from 'react-hook-form';
import type { FieldSpec } from './UiRegistry';
import { uiTypeRegistry } from './UiRegistry';

export function DynamicForm({
  fields,
  onSubmit,
  defaultValues,
}: {
  fields: FieldSpec[];
  defaultValues?: any;
  onSubmit: (values: any) => void;
}) {
  const form = useForm({ defaultValues: defaultValues ?? {} });
  const { handleSubmit, control } = form;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((f) => {
          const Comp = uiTypeRegistry[f.uiType as keyof typeof uiTypeRegistry];
          if (!Comp || f.visible === false) return null;
          return (
            <div key={f.name} data-group={f.group}>
              <Comp field={f} control={control} />
            </div>
          );
        })}
        <button className="px-4 py-2 rounded bg-black text-white" type="submit">
          Submit
        </button>
      </form>
    </FormProvider>
  );
}
