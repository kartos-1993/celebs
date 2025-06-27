import { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Form } from '@/components/ui/form';
import { ShoppingBag, Palette, Ruler, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProductForm } from '../hooks/useProductForm';
import { categoryService } from '../categoryService';
import { Category } from '../types/product';
import ProductFormSidebar from './productform-sidebar';
import CollapsibleFormSection from './collapsible-form-section';
import ValidationHelper from './validation-helper';
import ProductFormActions from './product-form-action';
import BasicInfoSection from './basic-info-section';
import FashionAttributes from './fashion-attributes';
import SizeChart from './sizechart';
import FashionVariants from './fashion-variants';
import ImageUpload from './image-upload';

const AddProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    form,
    formData,
    validationStatus,
    isLoading,
    isDirty,
    updateFormData,
    handleCategoryChange,
    handleSubcategoryChange,
    getValidationErrors,
    setIsDirty,
  } = useProductForm(id);

  // Set breadcrumbs

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await categoryService.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load categories',
          variant: 'destructive',
        });
      }
    };

    loadCategories();
  }, [toast]);

  const handleBasicInfoChange = (name: string, value: string) => {
    updateFormData({ [name]: value });
  };

  const handleSaveAsDraft = () => {
    const draftData = {
      ...formData,
      status: 'draft',
      savedAt: new Date().toISOString(),
    };

    console.log('Saving draft:', draftData);
    setIsDirty(false);

    toast({
      title: 'Draft Saved',
      description: 'Your product has been saved as a draft',
    });
  };

  const handlePublish = async (values: any) => {
    setIsSubmitting(true);

    // Comprehensive validation
    const allSectionsValid = Object.values(validationStatus).every(
      (status) => status,
    );

    if (!allSectionsValid) {
      const invalidSections = Object.entries(validationStatus)
        .filter(([_, isValid]) => !isValid)
        .map(([section]) => section);

      toast({
        title: 'Validation Error',
        description: `Please complete the following sections: ${invalidSections.join(', ')}`,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    // Merge form values with other data
    const finalData = {
      ...values,
      attributes: formData.attributes,
      variants: formData.variants,
      sizeChart: formData.sizeChart,
      images: formData.images,
    };

    try {
      // Here you would make the API call to save the product
      console.log('Publishing product:', finalData);

      toast({
        title: 'Success',
        description: `Product ${isEditMode ? 'updated' : 'created'} successfully!`,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/products');
      }, 1000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save product',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const canShowAdditionalSections =
    !!formData.categoryId && !!formData.subcategoryId;
  const completionPercentage = Math.round(
    (Object.values(validationStatus).filter(Boolean).length /
      Object.keys(validationStatus).length) *
      100,
  );

  if (isLoading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Loading categories...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300">
            {isEditMode ? 'Edit Product' : 'New Fashion Product'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {isEditMode
              ? 'Update your existing product'
              : 'Add a new product to your fashion store'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-3 space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handlePublish)}
                className="space-y-6"
              >
                {/* Basic Information */}
                <CollapsibleFormSection
                  title="Basic Information"
                  description="Essential product details and categorization"
                  icon={<ShoppingBag className="h-5 w-5 text-blue-700" />}
                  isValid={validationStatus.basicInfo}
                  isRequired={true}
                  defaultOpen={true}
                >
                  {/* <ValidationHelper
                    errors={getValidationErrors('basicInfo')}
                    isValid={validationStatus.basicInfo}
                  /> */}

                  <BasicInfoSection
                    control={form.control}
                    categories={categories}
                    selectedCategoryId={formData.categoryId}
                    selectedSubcategoryId={formData.subcategoryId}
                    onCategoryChange={handleCategoryChange}
                    onSubcategoryChange={handleSubcategoryChange}
                    onFieldChange={handleBasicInfoChange}
                  />
                </CollapsibleFormSection>

                {/* Fashion Attributes */}
                {canShowAdditionalSections && (
                  <CollapsibleFormSection
                    title="Fashion Attributes"
                    description="Detailed product specifications and style details"
                    icon={<Palette className="h-5 w-5 text-blue-700" />}
                    isValid={validationStatus.attributes}
                    isRequired={true}
                    defaultOpen={!validationStatus.basicInfo}
                  >
                    <ValidationHelper
                      errors={getValidationErrors('attributes')}
                      isValid={validationStatus.attributes}
                    />

                    <FashionAttributes
                      categoryType={formData.subcategoryId}
                      attributes={formData.attributes}
                      onAttributesChange={(attributes) =>
                        updateFormData({ attributes })
                      }
                    />
                  </CollapsibleFormSection>
                )}

                {/* Size Chart */}
                {canShowAdditionalSections && (
                  <CollapsibleFormSection
                    title="Size Chart & Measurements"
                    description="Size guide and fit recommendations"
                    icon={<Ruler className="h-5 w-5 text-blue-700" />}
                    isValid={validationStatus.sizeChart}
                    isRequired={true}
                    defaultOpen={!validationStatus.attributes}
                  >
                    <ValidationHelper
                      errors={getValidationErrors('sizeChart')}
                      isValid={validationStatus.sizeChart}
                    />

                    <SizeChart
                      measurements={formData.sizeChart}
                      onMeasurementsChange={(measurements) =>
                        updateFormData({ sizeChart: measurements })
                      }
                      categoryType={formData.subcategoryId}
                    />
                  </CollapsibleFormSection>
                )}

                {/* Color Variants */}
                {canShowAdditionalSections && (
                  <CollapsibleFormSection
                    title="Color Variants & Inventory"
                    description="Manage colors, pricing, and stock levels"
                    icon={<Palette className="h-5 w-5 text-blue-700" />}
                    isValid={validationStatus.variants}
                    isRequired={true}
                    defaultOpen={!validationStatus.sizeChart}
                  >
                    <ValidationHelper
                      errors={getValidationErrors('variants')}
                      isValid={validationStatus.variants}
                    />

                    <FashionVariants
                      variants={formData.variants}
                      onVariantsChange={(variants) =>
                        updateFormData({ variants })
                      }
                    />
                  </CollapsibleFormSection>
                )}

                {/* Product Images */}
                {canShowAdditionalSections && (
                  <CollapsibleFormSection
                    title="Product Images"
                    description="Main product photography and visual content"
                    icon={<ImageIcon className="h-5 w-5 text-blue-700" />}
                    isValid={validationStatus.images}
                    isRequired={true}
                    defaultOpen={!validationStatus.variants}
                  >
                    <ValidationHelper
                      errors={getValidationErrors('images')}
                      isValid={validationStatus.images}
                    />

                    <ImageUpload
                      onImagesChange={(images) => updateFormData({ images })}
                    />
                  </CollapsibleFormSection>
                )}

                {/* Form Actions */}
                {canShowAdditionalSections && (
                  <ProductFormActions
                    isValid={Object.values(validationStatus).every(
                      (status) => status,
                    )}
                    onSaveAsDraft={handleSaveAsDraft}
                    onPublish={form.handleSubmit(handlePublish)}
                    onCancel={() => navigate('/products')}
                    isDirty={isDirty}
                    isSubmitting={isSubmitting}
                  />
                )}
              </form>
            </Form>
          </div>

          {/* Sidebar */}
          {canShowAdditionalSections && (
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <ProductFormSidebar
                  validationStatus={validationStatus}
                  completionPercentage={completionPercentage}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
