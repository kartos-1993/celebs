import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, Star } from 'lucide-react';

interface ValidationStatus {
  basicInfo: boolean;
  attributes: boolean;
  sizeChart: boolean;
  variants: boolean;
  images: boolean;
}

interface ProductFormSidebarProps {
  validationStatus: ValidationStatus;
  completionPercentage: number;
}

const ProductFormSidebar = ({
  validationStatus,
  completionPercentage,
}: ProductFormSidebarProps) => {
  const sections = [
    {
      key: 'basicInfo',
      label: 'Basic Information',
      status: validationStatus.basicInfo,
    },
    {
      key: 'attributes',
      label: 'Fashion Attributes',
      status: validationStatus.attributes,
    },
    {
      key: 'sizeChart',
      label: 'Size Chart',
      status: validationStatus.sizeChart,
    },
    {
      key: 'variants',
      label: 'Color Variants',
      status: validationStatus.variants,
    },
    { key: 'images', label: 'Product Images', status: validationStatus.images },
  ];

  const getQualityScore = () => {
    const completedSections =
      Object.values(validationStatus).filter(Boolean).length;
    const totalSections = Object.keys(validationStatus).length;
    return Math.round((completedSections / totalSections) * 100);
  };

  const getQualityBadge = () => {
    const score = getQualityScore();
    if (score >= 80)
      return {
        label: 'Excellent',
        variant: 'default' as const,
        color: 'text-green-600',
      };
    if (score >= 60)
      return {
        label: 'Good',
        variant: 'secondary' as const,
        color: 'text-blue-600',
      };
    if (score >= 40)
      return {
        label: 'Fair',
        variant: 'secondary' as const,
        color: 'text-yellow-600',
      };
    return {
      label: 'Needs Work',
      variant: 'destructive' as const,
      color: 'text-red-600',
    };
  };

  const qualityBadge = getQualityBadge();

  return (
    <div className="space-y-4">
      {/* Content Quality Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5" />
            Content Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">{getQualityScore()}%</div>
            <Badge variant={qualityBadge.variant} className="mb-3">
              {qualityBadge.label}
            </Badge>
            <Progress value={getQualityScore()} className="h-2" />
          </div>
          <p className="text-sm text-gray-600">
            Complete all sections for better product visibility and sales
            performance.
          </p>
        </CardContent>
      </Card>

      {/* Section Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Section Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sections.map((section) => (
              <div
                key={section.key}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {section.status ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span
                    className={`text-sm ${section.status ? 'text-green-600' : 'text-gray-600'}`}
                  >
                    {section.label}
                  </span>
                </div>
                {section.status && (
                  <Badge variant="outline" className="text-xs">
                    Complete
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Add at least 4 high-quality images per color variant</p>
            <p>• Include detailed size measurements for better fit</p>
            <p>• Use descriptive product names with key features</p>
            <p>• Complete all fashion attributes for better search</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductFormSidebar;
