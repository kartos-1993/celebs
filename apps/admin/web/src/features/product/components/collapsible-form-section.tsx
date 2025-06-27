import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CollapsibleFormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  isValid?: boolean;
  isRequired?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

const CollapsibleFormSection = ({
  title,
  description,
  icon,
  isValid = false,
  isRequired = false,
  defaultOpen = true,
  children,
  onOpenChange,
}: CollapsibleFormSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Card
      className={`transition-all duration-200 ${isOpen ? 'shadow-md' : 'shadow-sm'} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800`}
    >
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                    {title}
                    {isRequired && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                    {isValid && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {!isValid && isRequired && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </CardTitle>
                  {description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-700 dark:text-gray-200"
              >
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-800">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CollapsibleFormSection;
