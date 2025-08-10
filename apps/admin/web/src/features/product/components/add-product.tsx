import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form } from '@/components/ui/form';
import { ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProductForm } from '../hooks/useProductForm';
import ProductFormSidebar from './productform-sidebar';
import CollapsibleFormSection from './collapsible-form-section';
import ValidationHelper from './validation-helper';
import ProductFormActions from './product-form-action';
import BasicInfoSection from './basic-info-section';

import ImageUpload from './image-upload';
import DynamicProductForm from './dynamic-product-form';

const AddProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryPath, setCategoryPath] = useState<string[] | undefined>();

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

  // No upfront categories fetch; the dropdown fetches category tree lazily

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
  categoryPath,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Loading...
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
                
                  <BasicInfoSection
                    control={form.control}
                    selectedCategoryId={formData.categoryId}
                    selectedSubcategoryId={formData.subcategoryId}
                    onCategoryChange={handleCategoryChange}
                    onSubcategoryChange={handleSubcategoryChange}
                    onFieldChange={handleBasicInfoChange}
                    onCategoryPathChange={setCategoryPath}
                    categoryPath={categoryPath}
                  />
                

                {/* Render server-driven sections after category selection */}
                {canShowAdditionalSections && (
                  <DynamicProductForm catId={formData.subcategoryId as any} />
                )}

                {/* Legacy bespoke sections below are temporarily hidden to avoid duplication with composer-driven UI */}

              
                

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
