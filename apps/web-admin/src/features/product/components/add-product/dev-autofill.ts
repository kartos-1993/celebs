import type { UseFormReturn } from 'react-hook-form';
import type { FieldSpec } from '../../types';
import type { ProductFormValues } from '../../hooks/use-product-form';

type LooseSetValue = (
    name: string,
    value: unknown,
    options?: { shouldDirty?: boolean; shouldValidate?: boolean },
) => void;

/** Development-only: fills the form with mock data (skips Cloudinary uploads). */
export function autofillProductForm(
    form: UseFormReturn<ProductFormValues>,
    schemaFields: FieldSpec[],
): void {
    const setValueLoose = form.setValue as unknown as LooseSetValue;
    const getValueLoose = form.getValues as unknown as (name: string) => unknown;

    form.setValue(
        'name',
        "Manfinity Hypemode Men's Solid Ribbed Long Sleeve Polo Shirt, Old Money Style",
        { shouldValidate: true },
    );
    form.setValue(
        'description',
        'High-quality ribbed knit polo shirt featuring a soft cotton blend, clean button placket, and classic tailoring. Highly breathable, perfect for styling in formal, transition, or casual settings.',
        { shouldValidate: true },
    );
    form.setValue('brand', 'Manfinity', { shouldValidate: true });
    form.setValue(
        'mainImage',
        [
            'https://res.cloudinary.com/celebsnp/image/upload/v1783941142/celebs/products/bln3u0xtadrgtioonfsn.png',
            'https://res.cloudinary.com/celebsnp/image/upload/v1783941153/celebs/products/dy4aw7qrlnj3uzglqbk5.png',
        ],
        { shouldValidate: true },
    );

    schemaFields.forEach((field) => {
        if (
            ['name', 'brand', 'description', 'categoryId', 'subcategoryId', 'mainImage'].includes(
                field.name,
            )
        ) {
            return;
        }
        const ui = field.uiType.toLowerCase();
        if (ui === 'input' || ui === 'text') {
            setValueLoose(field.name, 'Premium Cotton Blend', { shouldValidate: true });
        } else if (ui === 'number') {
            setValueLoose(field.name, 12, { shouldValidate: true });
        } else if (ui === 'switch') {
            setValueLoose(field.name, true, { shouldValidate: true });
        } else if (ui === 'select') {
            const items = (field.dataSource?.items ?? field.dataSource) as
                | Array<{ value?: string }>
                | undefined;
            const firstOpt = Array.isArray(items) ? items[0]?.value : undefined;
            if (firstOpt) setValueLoose(field.name, firstOpt, { shouldValidate: true });
        } else if (ui === 'multiselect' || ui === 'variantlist') {
            const items = (field.dataSource?.items ?? field.dataSource) as
                | Array<{ value?: string }>
                | undefined;
            const opts = Array.isArray(items)
                ? items.slice(0, 2).map((option) => option.value).filter(Boolean)
                : ['Blue', 'White'];
            setValueLoose(field.name, opts, { shouldValidate: true });
        }
    });

    setValueLoose('sku.default.price', '1200', { shouldValidate: true });
    setValueLoose('sku.default.stock', '15', { shouldValidate: true });
    setValueLoose('sku.default.sellerSku', 'POLO-SHIRT-MOCK', { shouldValidate: true });
    setValueLoose('sku.default.available', true, { shouldValidate: true });

    const colors = (getValueLoose('Color') as string[] | undefined) || ['Blue', 'White'];
    colors.forEach((color) => {
        const prefix = `variants.colorMeta.${color}`;
        setValueLoose(`${prefix}.hot`, false);
        setValueLoose(
            `${prefix}.swatch`,
            'https://res.cloudinary.com/celebsnp/image/upload/v1783941189/celebs/products/qrxlasu3b8wercsjciod.png',
        );
        setValueLoose(`${prefix}.images`, [
            'https://res.cloudinary.com/celebsnp/image/upload/v1783941201/celebs/products/okt4fj4pzwhwqgidijnf.png',
            'https://res.cloudinary.com/celebsnp/image/upload/v1783941232/celebs/products/t4qusgbfbeg2klkkckaf.png',
        ]);
    });

    const currentSizes = (getValueLoose('sizes') as
        | Array<{
            name?: string;
            productMeasurements?: Array<{ name?: string; value?: string }>;
            bodyMeasurements?: Array<{ name?: string; value?: string }>;
        }>
        | undefined) || [];
    const updatedSizes = currentSizes.map((sizeObj) => {
        const populate = (list?: Array<{ name?: string; value?: string }>) =>
            (list || []).map((measurement) => ({ ...measurement, value: '45.5' }));
        return {
            ...sizeObj,
            productMeasurements: populate(sizeObj.productMeasurements),
            bodyMeasurements: populate(sizeObj.bodyMeasurements),
        };
    });
    setValueLoose('sizes', updatedSizes, { shouldValidate: true });
}