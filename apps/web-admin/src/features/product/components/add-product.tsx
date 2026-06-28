import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Form } from '@celebs/shared-ui/components/form';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, FileClock, Info } from 'lucide-react';
import { CreateProductRequest, ProductApiService } from '../api';
import { useProductForm } from '../hooks/useProductForm';
import type { FieldSpec } from '../renderer/UiRegistry';
import { extractVariantsMeta } from '../renderer/variant-utils';
import BasicInfoSection from './basic-info-section';
import DynamicProductForm from './dynamic-product-form';
import ProductFormActions from './product-form-action';
import ProductFormSidebar, {
  ProductSidebarSection,
} from './productform-sidebar';

const MANAGE_PRODUCTS_PATH = '/products/manage';
const DRAFT_STORAGE_KEY = 'web-admin.product-draft.add';

type PageSectionKey =
  | 'basic'
  | 'images'
  | 'specification'
  | 'pricing'
  | 'shipping'
  | 'terms';

interface FlattenedError {
  message: string;
  path: string;
}

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }

  const text = normalizeText(value);
  return text ? [text] : [];
};

const toPositiveNumber = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;

  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

const toNonNegativeInteger = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;

  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric >= 0
    ? Math.trunc(numeric)
    : undefined;
};

const serializeDynamicValue = (value: unknown): unknown => {
  if (value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      type: value.type,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeDynamicValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        serializeDynamicValue(entry),
      ]),
    );
  }

  return value;
};

const serializeDraftValue = (value: unknown): unknown => {
  if (value instanceof File) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const next = value
      .map((entry) => serializeDraftValue(entry))
      .filter((entry) => typeof entry !== 'undefined');
    return next;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, serializeDraftValue(entry)])
        .filter(([, entry]) => typeof entry !== 'undefined'),
    );
  }

  return value;
};

const isHexColor = (value: string) =>
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

const getFirstPrice = (
  values: Record<string, unknown>,
  suffix: '.price' | '.specialPrice',
) => {
  const preferredKeys = [
    `sku.default${suffix}`,
    ...Object.keys(values)
      .filter((key) => key.startsWith('sku.variants.') && key.endsWith(suffix))
      .sort(),
  ];

  for (const key of preferredKeys) {
    const numeric = toPositiveNumber(values[key]);
    if (numeric !== undefined) {
      return numeric;
    }
  }

  return undefined;
};

const getLabelMap = (fields: FieldSpec[], fieldName?: string) => {
  if (!fieldName) {
    return new Map<string, string>();
  }

  const field = fields.find((entry) => entry.name === fieldName);
  if (!field || !Array.isArray(field.dataSource)) {
    return new Map<string, string>();
  }

  return new Map<string, string>(
    field.dataSource
      .filter(
        (option): option is { value: string; label: string } =>
          Boolean(option?.value) && Boolean(option?.label),
      )
      .map((option) => [String(option.value), String(option.label)]),
  );
};

const normalizeGroup = (value?: string) =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const mapSchemaGroup = (value?: string) => {
  const normalized = normalizeGroup(value);

  if (
    ['base', 'productimages', 'images', 'mainimage', 'media'].includes(
      normalized,
    )
  ) {
    return 'base';
  }
  if (
    [
      'details',
      'productspecification',
      'specification',
      'attributes',
      'basic',
      'basicinfo',
      'general',
      'info',
      'title',
      'productname',
      'brand',
    ].includes(normalized)
  ) {
    return 'details';
  }
  if (
    [
      'variant',
      'variants',
      'variant1',
      'variant2',
      'sku',
      'color',
      'size',
    ].includes(normalized)
  ) {
    return 'variant';
  }
  if (
    ['sale', 'pricestock', 'priceandstock', 'pricing', 'stock'].includes(
      normalized,
    )
  ) {
    return 'sale';
  }
  if (
    ['package', 'shippingandwarranty', 'shipping', 'warranty'].includes(
      normalized,
    )
  ) {
    return 'package';
  }
  if (['termcondition', 'termsandconditions', 'terms'].includes(normalized)) {
    return 'termcondition';
  }

  return normalized || 'details';
};

const isFieldFilled = (field: FieldSpec, value: unknown) => {
  const uiType = normalizeGroup(field.uiType);

  if (uiType === 'switch') {
    return value !== undefined && value !== null;
  }

  if (
    uiType === 'multiselect' ||
    uiType === 'variantlist' ||
    uiType === 'mainimage' ||
    uiType === 'colorinline' ||
    uiType === 'colormeta'
  ) {
    return Array.isArray(value) ? value.length > 0 : false;
  }

  if (uiType === 'skutablev2') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  return normalizeText(value).length > 0;
};

const uniqueMessages = (messages: string[]) =>
  Array.from(new Set(messages.filter(Boolean)));

const getRequiredFieldErrors = (
  fields: FieldSpec[],
  values: Record<string, unknown>,
) =>
  fields
    .filter((field) => field.required && field.visible !== false)
    .filter((field) => !isFieldFilled(field, values[field.name]))
    .map((field) => `${field.label} is required.`);

const flattenFormErrors = (
  errors: FieldErrors<any> | Record<string, unknown> | undefined,
  parentPath = '',
): FlattenedError[] => {
  if (!errors || typeof errors !== 'object') {
    return [];
  }

  return Object.entries(errors).flatMap(([key, value]) => {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const entry = value as Record<string, unknown> | undefined;

    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const ownMessage =
      typeof entry.message === 'string'
        ? [{ path, message: entry.message }]
        : [];

    const childEntries = flattenFormErrors(
      Object.fromEntries(
        Object.entries(entry).filter(
          ([childKey]) => !['message', 'type', 'ref'].includes(childKey),
        ),
      ),
      path,
    );

    return [...ownMessage, ...childEntries];
  });
};

const resolveSchemaFieldForPath = (schemaFields: FieldSpec[], path: string) => {
  const parts = path.split('.');

  for (let index = parts.length; index > 0; index -= 1) {
    const candidate = parts.slice(0, index).join('.');
    const match = schemaFields.find((field) => field.name === candidate);
    if (match) {
      return match;
    }
  }

  return undefined;
};

const resolvePageSectionKey = (
  path: string,
  schemaFields: FieldSpec[],
): PageSectionKey => {
  if (
    ['name', 'brand', 'description', 'categoryId', 'subcategoryId'].includes(
      path,
    )
  ) {
    return 'basic';
  }

  if (path.startsWith('mainImage')) {
    return 'images';
  }

  if (path.startsWith('sku.')) {
    return 'pricing';
  }

  const matchedField = resolveSchemaFieldForPath(schemaFields, path);
  const group = mapSchemaGroup(matchedField?.group);

  switch (group) {
    case 'base':
      return 'images';
    case 'details':
      return 'specification';
    case 'variant':
    case 'sale':
      return 'pricing';
    case 'package':
      return 'shipping';
    case 'termcondition':
      return 'terms';
    default:
      return 'specification';
  }
};

const collectPricingErrors = ({
  fields,
  values,
  variantMeta,
}: {
  fields: FieldSpec[];
  values: Record<string, unknown>;
  variantMeta: Array<{ key: string; label: string }>;
}) => {
  const errors: string[] = [];
  let truncated = false;

  const pushError = (message: string) => {
    if (errors.length < 6) {
      errors.push(message);
    } else {
      truncated = true;
    }
  };

  const validateRow = (label: string, prefix: string) => {
    const price = toPositiveNumber(values[`${prefix}.price`]);
    const specialPriceRaw = normalizeText(values[`${prefix}.specialPrice`]);
    const specialPrice = specialPriceRaw
      ? toPositiveNumber(values[`${prefix}.specialPrice`])
      : undefined;
    const stock = normalizeText(values[`${prefix}.stock`]);
    const freeItems = normalizeText(values[`${prefix}.freeItems`]);

    if (price === undefined) {
      pushError(`${label}: add a valid price.`);
    }

    if (specialPriceRaw && specialPrice === undefined) {
      pushError(`${label}: special price must be greater than 0.`);
    }

    if (
      specialPrice !== undefined &&
      price !== undefined &&
      specialPrice >= price
    ) {
      pushError(`${label}: special price must be lower than price.`);
    }

    if (
      stock &&
      toNonNegativeInteger(values[`${prefix}.stock`]) === undefined
    ) {
      pushError(`${label}: stock cannot be negative.`);
    }

    if (
      freeItems &&
      toNonNegativeInteger(values[`${prefix}.freeItems`]) === undefined
    ) {
      pushError(`${label}: free items cannot be negative.`);
    }
  };

  if (variantMeta.length > 2) {
    pushError('Only two variant groups are supported in the pricing matrix.');
  }

  const activeVariants = variantMeta.slice(0, 2).map((variant) => ({
    key: variant.key,
    label: variant.label,
    labels: getLabelMap(fields, variant.key),
    values: toStringArray(values[variant.key]),
  }));

  if (activeVariants.length === 0) {
    validateRow('Default SKU', 'sku.default');
  } else if (activeVariants.some((variant) => variant.values.length === 0)) {
    // Required variant selectors are handled elsewhere.
  } else if (activeVariants.length === 1) {
    activeVariants[0].values.forEach((variantValue) => {
      const label = activeVariants[0].labels.get(variantValue) || variantValue;
      validateRow(
        `${activeVariants[0].label}: ${label}`,
        `sku.variants.${activeVariants[0].key}.${variantValue}`,
      );
    });
  } else {
    activeVariants[0].values.forEach((firstValue) => {
      activeVariants[1].values.forEach((secondValue) => {
        const firstLabel =
          activeVariants[0].labels.get(firstValue) || firstValue;
        const secondLabel =
          activeVariants[1].labels.get(secondValue) || secondValue;

        validateRow(
          `${activeVariants[0].label}: ${firstLabel}, ${activeVariants[1].label}: ${secondLabel}`,
          `sku.variants.${activeVariants[0].key}.${firstValue}.${activeVariants[1].key}.${secondValue}`,
        );
      });
    });
  }

  if (truncated) {
    errors.push('More pricing rows still need attention.');
  }

  return errors;
};

const buildSidebarSections = ({
  fieldErrors,
  schemaFields,
  schemaHasName,
  values,
  variantMeta,
}: {
  fieldErrors: FlattenedError[];
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  values: Record<string, unknown>;
  variantMeta: Array<{ key: string; label: string }>;
}): ProductSidebarSection[] => {
  const groupedErrors = fieldErrors.reduce<Record<PageSectionKey, string[]>>(
    (acc, error) => {
      const key = resolvePageSectionKey(error.path, schemaFields);
      acc[key].push(error.message);
      return acc;
    },
    {
      basic: [],
      images: [],
      specification: [],
      pricing: [],
      shipping: [],
      terms: [],
    },
  );

  const groupedFields = {
    base: schemaFields.filter(
      (field) => mapSchemaGroup(field.group) === 'base',
    ),
    details: schemaFields.filter(
      (field) => mapSchemaGroup(field.group) === 'details',
    ),
    variant: schemaFields.filter(
      (field) => mapSchemaGroup(field.group) === 'variant',
    ),
    package: schemaFields.filter(
      (field) => mapSchemaGroup(field.group) === 'package',
    ),
    terms: schemaFields.filter(
      (field) => mapSchemaGroup(field.group) === 'termcondition',
    ),
  };

  const basicErrors = uniqueMessages([
    ...groupedErrors.basic,
    ...(!schemaHasName && normalizeText(values.name).length < 2
      ? ['Product name must be at least 2 characters.']
      : []),
    ...(normalizeText(values.description).length < 10
      ? ['Product description must be at least 10 characters.']
      : []),
    ...(!normalizeText(values.categoryId) ||
    !normalizeText(values.subcategoryId)
      ? ['Select a product category before publishing.']
      : []),
  ]);

  const imageErrors = uniqueMessages([
    ...groupedErrors.images,
    ...getRequiredFieldErrors(groupedFields.base, values),
  ]);

  const specificationErrors = uniqueMessages([
    ...groupedErrors.specification,
    ...getRequiredFieldErrors(groupedFields.details, values),
  ]);

  const pricingErrors = uniqueMessages([
    ...groupedErrors.pricing,
    ...getRequiredFieldErrors(
      groupedFields.variant.filter((field) => field.uiType !== 'ColorInline'),
      values,
    ),
    ...collectPricingErrors({
      fields: schemaFields,
      values,
      variantMeta,
    }),
  ]);

  const shippingErrors = uniqueMessages([
    ...groupedErrors.shipping,
    ...getRequiredFieldErrors(groupedFields.package, values),
  ]);

  const termsErrors = uniqueMessages([
    ...groupedErrors.terms,
    ...getRequiredFieldErrors(groupedFields.terms, values),
  ]);

  const sections: ProductSidebarSection[] = [
    {
      key: 'basic',
      label: 'Basic Information',
      anchorId: 'product-section-basic',
      status: basicErrors.length === 0,
      errors: basicErrors,
    },
  ];

  if (schemaFields.length > 0) {
    sections.push(
      {
        key: 'images',
        label: 'Product Images',
        anchorId: 'product-section-base',
        status: imageErrors.length === 0,
        errors: imageErrors,
      },
      {
        key: 'specification',
        label: 'Product Specification',
        anchorId: 'product-section-details',
        status: specificationErrors.length === 0,
        errors: specificationErrors,
      },
      {
        key: 'pricing',
        label: 'Price, Stock & Variants',
        anchorId:
          pricingErrors.length > 0 &&
          groupedFields.variant.some((field) => field.required)
            ? 'product-section-variant'
            : 'product-section-sale',
        status: pricingErrors.length === 0,
        errors: pricingErrors,
      },
      {
        key: 'shipping',
        label: 'Shipping & Warranty',
        anchorId: 'product-section-package',
        status: shippingErrors.length === 0,
        errors: shippingErrors,
      },
    );

    if (
      groupedFields.terms.some(
        (field) => field.required || field.visible !== false,
      )
    ) {
      sections.push({
        key: 'terms',
        label: 'Terms & Conditions',
        anchorId: 'product-section-termcondition',
        status: termsErrors.length === 0,
        errors: termsErrors,
      });
    }
  }

  return sections;
};

async function buildProductPayload({
  fields,
  status,
  values,
}: {
  fields: FieldSpec[];
  status: CreateProductRequest['status'];
  values: Record<string, unknown>;
}): Promise<CreateProductRequest> {
  const { variants: variantMeta, colorFieldName } = extractVariantsMeta(fields);
  const sizeFieldName = variantMeta.find(
    (variant) => variant.kind === 'size',
  )?.key;
  const colorLabelMap = getLabelMap(fields, colorFieldName);
  const sizeLabelMap = getLabelMap(fields, sizeFieldName);

  const mainImages = await ProductApiService.uploadFiles(
    Array.isArray(values.mainImage)
      ? (values.mainImage as Array<File | string>)
      : [],
  );

  const selectedColors = colorFieldName
    ? toStringArray(values[colorFieldName])
    : [];
  const selectedSizes = sizeFieldName
    ? toStringArray(values[sizeFieldName])
    : [];

  const uploadedColorAssets: Record<
    string,
    { hot: boolean; images: string[]; swatch?: string }
  > = {};

  for (const colorValue of selectedColors) {
    const prefix = `variants.colorMeta.${colorValue}`;
    const swatchUrls = await ProductApiService.uploadFiles([
      values[`${prefix}.swatch`] as File | string | undefined,
    ]);
    const images = await ProductApiService.uploadFiles(
      Array.isArray(values[`${prefix}.images`])
        ? (values[`${prefix}.images`] as Array<File | string>)
        : [],
    );

    uploadedColorAssets[colorValue] = {
      swatch: swatchUrls[0],
      images,
      hot: Boolean(values[`${prefix}.hot`]),
    };
  }

  const price = getFirstPrice(values, '.price');
  if (price === undefined) {
    throw new Error('Add a valid price before publishing the product.');
  }

  const discountedPrice = getFirstPrice(values, '.specialPrice');
  if (discountedPrice !== undefined && discountedPrice >= price) {
    throw new Error('Discounted price must be less than the regular price.');
  }

  const defaultStock = toNonNegativeInteger(values['sku.default.stock']) ?? 0;
  const effectiveColors =
    selectedColors.length > 0 ? selectedColors : ['default'];

  const sizes = selectedSizes.map((sizeValue) => ({
    name: sizeLabelMap.get(sizeValue) || sizeValue,
    productMeasurements: [],
    bodyMeasurements: [],
  }));

  const colorVariants = effectiveColors.map((colorValue) => {
    const label =
      colorValue === 'default'
        ? 'Default'
        : colorLabelMap.get(colorValue) || colorValue;

    let stocks: Array<{ size: string; quantity: number }> = [];

    if (
      selectedColors.length > 0 &&
      sizeFieldName &&
      selectedSizes.length > 0
    ) {
      stocks = selectedSizes.map((sizeValue) => ({
        size: sizeLabelMap.get(sizeValue) || sizeValue,
        quantity:
          toNonNegativeInteger(
            values[
              `sku.variants.${colorFieldName}.${colorValue}.${sizeFieldName}.${sizeValue}.stock`
            ],
          ) ?? defaultStock,
      }));
    } else if (selectedColors.length > 0 && colorFieldName) {
      stocks = [
        {
          size: 'default',
          quantity:
            toNonNegativeInteger(
              values[`sku.variants.${colorFieldName}.${colorValue}.stock`],
            ) ?? defaultStock,
        },
      ];
    } else if (sizeFieldName && selectedSizes.length > 0) {
      stocks = selectedSizes.map((sizeValue) => ({
        size: sizeLabelMap.get(sizeValue) || sizeValue,
        quantity:
          toNonNegativeInteger(
            values[`sku.variants.${sizeFieldName}.${sizeValue}.stock`],
          ) ?? defaultStock,
      }));
    } else {
      stocks = [{ size: 'default', quantity: defaultStock }];
    }

    const assets = uploadedColorAssets[colorValue];

    return {
      name: label,
      colorCode:
        colorValue === 'default'
          ? '#000000'
          : isHexColor(colorValue)
            ? colorValue
            : isHexColor(label)
              ? label
              : colorValue,
      images: assets?.images?.length ? assets.images : mainImages,
      stocks,
    };
  });

  return {
    name: normalizeText(values.name),
    brand: normalizeText(values.brand) || undefined,
    description: normalizeText(values.description),
    price,
    discountedPrice,
    categoryId: String(values.categoryId || ''),
    subcategoryId: String(values.subcategoryId || ''),
    sizes,
    colorVariants,
    mainImages,
    dynamicData: {
      values: Object.fromEntries(
        Object.entries(values)
          .filter(
            ([key]) =>
              ![
                'name',
                'brand',
                'description',
                'categoryId',
                'subcategoryId',
                'status',
              ].includes(key),
          )
          .map(([key, value]) => [key, serializeDynamicValue(value)]),
      ),
      uploadedAssets: {
        mainImages,
        colorMeta: uploadedColorAssets,
      },
      variantFields: variantMeta,
    },
    tags: [],
    featured: false,
    status,
  };
}

const AddProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const { toast } = useToast();
  const [categoryPath, setCategoryPath] = useState<string[] | undefined>();
  const [schemaFields, setSchemaFields] = useState<FieldSpec[]>([]);
  const [schemaHasBrand, setSchemaHasBrand] = useState(false);
  const [schemaHasName, setSchemaHasName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);

  const { form, isLoading, updateBasicField, handleSubcategoryChange } =
    useProductForm(id);
  const formValues = form.watch() as Record<string, unknown>;

  const watchedCategoryId = String(formValues.categoryId || '');
  const watchedSubcategoryId = String(formValues.subcategoryId || '');

  const { variants: variantMeta } = useMemo(
    () => extractVariantsMeta(schemaFields),
    [schemaFields],
  );

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as {
        categoryPath?: string[];
        savedAt?: string;
        values?: Record<string, unknown>;
      };

      if (draft.values) {
        form.reset({
          ...draft.values,
          status: 'draft',
        });
      }

      if (Array.isArray(draft.categoryPath)) {
        setCategoryPath(draft.categoryPath);
      }

      if (draft.savedAt) {
        setRestoredDraftAt(draft.savedAt);
      }
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [form, isEditMode]);

  const fieldErrors = useMemo(
    () => flattenFormErrors(form.formState.errors),
    [form.formState.errors],
  );

  const sidebarSections = useMemo(
    () =>
      buildSidebarSections({
        fieldErrors,
        schemaFields,
        schemaHasName,
        values: formValues,
        variantMeta: variantMeta.map((variant) => ({
          key: variant.key,
          label: variant.label,
        })),
      }),
    [fieldErrors, formValues, schemaFields, schemaHasName, variantMeta],
  );

  const completionPercentage = useMemo(() => {
    if (sidebarSections.length === 0) return 0;

    return Math.round(
      (sidebarSections.filter((section) => section.status).length /
        sidebarSections.length) *
        100,
    );
  }, [sidebarSections]);

  const canShowAdditionalSections = Boolean(
    watchedCategoryId && watchedSubcategoryId,
  );
  const schemaReady = schemaFields.length > 0;

  const scrollToSection = (anchorId: string) => {
    document
      .getElementById(anchorId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearDynamicState = (categoryId: string) => {
    const currentValues = form.getValues();

    form.reset({
      name: String(currentValues.name || ''),
      brand: String(currentValues.brand || ''),
      description: String(currentValues.description || ''),
      categoryId,
      subcategoryId: '',
      status:
        (currentValues.status as 'draft' | 'published' | 'archived') || 'draft',
    });

    setSchemaFields([]);
    setSchemaHasBrand(false);
    setSchemaHasName(false);
    form.clearErrors();
  };

  const handleCategoryChange = (categoryId: string) => {
    clearDynamicState(categoryId);
  };

  const handleDynamicValuesChange = useCallback(
    (values: Record<string, unknown>) => {
      const normalizedEntries = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key.toLowerCase(),
          value,
        ]),
      );

      const nameKey = ['name', 'productname', 'title'].find(
        (key) => key in normalizedEntries,
      );
      if (nameKey) {
        const newValue = String(normalizedEntries[nameKey] ?? '');
        if (form.getValues('name') !== newValue) {
          form.setValue('name', newValue, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }

      const brandKey = ['brand', 'productbrand'].find(
        (key) => key in normalizedEntries,
      );
      if (brandKey) {
        const newValue = String(normalizedEntries[brandKey] ?? '');
        if (form.getValues('brand') !== newValue) {
          form.setValue('brand', newValue, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }
    },
    [form],
  );

  const handleSchemaLoaded = useCallback((fields: FieldSpec[]) => {
    setSchemaFields(fields);
    const names = new Set(fields.map((field) => field.name.toLowerCase()));

    setSchemaHasName(
      names.has('name') || names.has('productname') || names.has('title'),
    );
    setSchemaHasBrand(names.has('brand') || names.has('productbrand'));
  }, []);

  const handleSaveAsDraft = () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        categoryPath,
        savedAt: new Date().toISOString(),
        values: serializeDraftValue(form.getValues()),
      }),
    );

    form.reset(form.getValues());
    setRestoredDraftAt(new Date().toISOString());

    toast({
      title: 'Draft saved locally',
      description:
        'Text, category, and pricing fields were saved locally. Images will need to be uploaded again.',
    });
  };

  const applyServerErrors = (error: any) => {
    const apiErrors = Array.isArray(error?.data)
      ? error.data
      : Array.isArray(error?.response?.data?.data)
        ? error.response.data.data
        : [];

    const unmappedMessages: string[] = [];

    apiErrors.forEach((entry: any) => {
      const path = normalizeText(entry?.path);
      const message = normalizeText(entry?.message);

      if (!message) {
        return;
      }

      if (path) {
        form.setError(path as any, {
          type: 'server',
          message,
        });
      } else {
        unmappedMessages.push(message);
      }
    });

    return uniqueMessages(unmappedMessages);
  };

  const handleSubmitProduct = async (
    status: CreateProductRequest['status'],
  ) => {
    if (!schemaReady) {
      toast({
        title: 'Form is still loading',
        description:
          'Wait for the category-specific fields to finish loading before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const currentValues = form.getValues() as Record<string, unknown>;
    const currentSections = buildSidebarSections({
      fieldErrors: flattenFormErrors(form.formState.errors),
      schemaFields,
      schemaHasName,
      values: currentValues,
      variantMeta: variantMeta.map((variant) => ({
        key: variant.key,
        label: variant.label,
      })),
    });
    const firstInvalidSection = currentSections.find(
      (section) => !section.status,
    );

    if (firstInvalidSection) {
      scrollToSection(firstInvalidSection.anchorId);
      toast({
        title: 'Complete the required sections',
        description: firstInvalidSection.errors[0] || firstInvalidSection.label,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await buildProductPayload({
        fields: schemaFields,
        status,
        values: currentValues,
      });

      await ProductApiService.createProduct(payload);

      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      form.reset(form.getValues());

      toast({
        title: 'Product created',
        description: 'The product has been submitted successfully.',
      });

      navigate(MANAGE_PRODUCTS_PATH);
    } catch (error: any) {
      const serverMessages = applyServerErrors(error);

      toast({
        title: 'Unable to save product',
        description:
          serverMessages[0] ||
          error?.message ||
          'Review the highlighted fields and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormInvalid = (errors: FieldErrors<any>) => {
    const sections = buildSidebarSections({
      fieldErrors: flattenFormErrors(errors),
      schemaFields,
      schemaHasName,
      values: form.getValues() as Record<string, unknown>,
      variantMeta: variantMeta.map((variant) => ({
        key: variant.key,
        label: variant.label,
      })),
    });
    const firstInvalidSection = sections.find((section) => !section.status);

    if (firstInvalidSection) {
      scrollToSection(firstInvalidSection.anchorId);
      toast({
        title: 'Fix the highlighted fields',
        description: firstInvalidSection.errors[0] || firstInvalidSection.label,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-zinc-50 dark:bg-zinc-950">
        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Loading product form...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <span>Catalog</span>
          <ChevronRight className="h-4 w-4" />
          <span>Manage Products</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {isEditMode ? 'Edit Product' : 'Add Product'}
          </span>
        </div>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300">
              Product Publishing
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                {isEditMode ? 'Update Product' : 'Create a new product listing'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
                Complete the required catalog information, upload compliant
                media, and verify pricing before submitting the product.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
              Submission State
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {completionPercentage === 100 ? 'Ready to submit' : 'In progress'}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {sidebarSections.filter((section) => section.status).length} of{' '}
              {sidebarSections.length} sections completed.
            </p>
          </div>
        </div>

        {restoredDraftAt ? (
          <div className="mb-6 flex items-start gap-3 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <FileClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="font-semibold">Local draft restored</p>
              <p className="mt-1 text-amber-800 dark:text-amber-300">
                This form was restored from a browser draft saved on{' '}
                {new Date(restoredDraftAt).toLocaleString()}.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(
                  () => handleSubmitProduct('published'),
                  handleFormInvalid,
                )}
                className="space-y-6"
              >
                <section
                  id="product-section-basic"
                  className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8"
                >
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      Basic Information
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                      Start with the category, name, brand, and description. The
                      remaining sections adapt to the chosen category.
                    </p>
                  </div>

                  <BasicInfoSection
                    control={form.control}
                    selectedCategoryId={watchedCategoryId}
                    selectedSubcategoryId={watchedSubcategoryId}
                    onCategoryChange={handleCategoryChange}
                    onSubcategoryChange={handleSubcategoryChange}
                    onFieldChange={updateBasicField}
                    onCategoryPathChange={setCategoryPath}
                    categoryPath={categoryPath}
                    hideBrand={schemaHasBrand}
                    hideName={schemaHasName}
                  />
                </section>

                {canShowAdditionalSections ? (
                  <DynamicProductForm
                    key={watchedSubcategoryId}
                    catId={watchedSubcategoryId}
                    productId={id}
                    onValuesChange={handleDynamicValuesChange}
                    onSchemaLoaded={handleSchemaLoaded}
                  />
                ) : null}

                {canShowAdditionalSections ? (
                  <ProductFormActions
                    isDirty={form.formState.isDirty}
                    isReady={
                      schemaReady &&
                      sidebarSections.every((section) => section.status)
                    }
                    onSaveAsDraft={handleSaveAsDraft}
                    onCancel={() => navigate(MANAGE_PRODUCTS_PATH)}
                    isSubmitting={isSubmitting}
                  />
                ) : (
                  <div className="rounded-[28px] border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                    Select a category to unlock the product specification,
                    pricing, and shipping sections.
                  </div>
                )}
              </form>
            </Form>
          </div>

          {canShowAdditionalSections ? (
            <div className="lg:sticky lg:top-6 lg:self-start">
              <ProductFormSidebar
                completionPercentage={completionPercentage}
                sections={sidebarSections}
                onSectionClick={scrollToSection}
                tips={[
                  'Use at least three clear product images for a stronger listing.',
                  'Fill every required attribute generated from the selected category.',
                  'Check special prices against regular prices before submitting.',
                ]}
              />
            </div>
          ) : (
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                <p>
                  The sidebar checklist appears once a category has been chosen
                  and the category-specific form has loaded.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProduct;

