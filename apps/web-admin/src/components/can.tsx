import React from 'react';

import type { PermissionMode,PermissionRequirement } from '@celebs/rbac';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@celebs/shared-ui/components/tooltip';

import { usePermission } from '@/hooks/use-permission';

export interface ChildElementProps {
  disabled?: boolean;
  className?: string;
  'aria-disabled'?: boolean | 'true' | 'false';
}

interface CanProps {
  permissions: PermissionRequirement;
  mode?: 'hide' | 'disable';
  permissionMode?: PermissionMode;
  disabledTooltip?: string;
  fallback?: React.ReactNode;
  children: React.ReactElement<ChildElementProps>;
}

export const Can: React.FC<CanProps> = ({
  permissions,
  mode = 'hide',
  permissionMode = 'ANY',
  disabledTooltip = 'You do not have permission to perform this action',
  fallback = null,
  children,
}) => {
  const isAllowed = usePermission(permissions, permissionMode);

  if (isAllowed) return children;
  if (mode === 'hide') return <>{fallback}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">
            {React.cloneElement(children, {
              disabled: true,
              className: `${children.props?.className ?? ''} pointer-events-none opacity-50`,
              'aria-disabled': true,
            })}
          </span>
        </TooltipTrigger>
        <TooltipContent>{disabledTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Can;
