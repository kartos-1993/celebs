import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import { Button } from '@celebs/shared-ui/components/button';
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
} from '@celebs/shared-ui/components/collapsible';

interface CollapsibleFormSectionProps {
  id?: string;
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
  id,
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
      id={id}
      className={`rounded-[32px] border border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 ${isOpen ? 'shadow-md' : 'shadow-sm'}`}
    >
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer rounded-t-[32px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-gray-100">
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
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="rounded-full text-gray-500 dark:text-gray-300"
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
          <CardContent className="border-t border-gray-100 pt-0 text-gray-900 dark:border-gray-800 dark:text-gray-100">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CollapsibleFormSection;

