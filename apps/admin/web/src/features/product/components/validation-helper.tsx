import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ValidationHelperProps {
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
  isValid?: boolean;
  showSuccess?: boolean;
}

const ValidationHelper = ({
  errors = [],
  warnings = [],
  suggestions = [],
  isValid = false,
  showSuccess = true,
}: ValidationHelperProps) => {
  if (
    errors.length === 0 &&
    warnings.length === 0 &&
    suggestions.length === 0 &&
    !showSuccess
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Success Message */}
      {isValid && showSuccess && errors.length === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            This section is complete and valid.
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {errors.map((error, index) => (
        <Alert key={`error-${index}`} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ))}

      {/* Warnings */}
      {warnings.map((warning, index) => (
        <Alert
          key={`warning-${index}`}
          className="border-yellow-200 bg-yellow-50"
        >
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            {warning}
          </AlertDescription>
        </Alert>
      ))}

      {/* Suggestions */}
      {suggestions.map((suggestion, index) => (
        <Alert
          key={`suggestion-${index}`}
          className="border-blue-200 bg-blue-50"
        >
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            {suggestion}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default ValidationHelper;
