import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface DeviceFrameProps {
  /** Fixed frame width in px (e.g. SDUI device presets). Omit for fluid width. */
  width?: number;
  className?: string;
  /** Sizing for the screen area (e.g. `h-[720px]`). Omit for natural height. */
  screenClassName?: string;
  withIsland?: boolean;
  children: ReactNode;
}

/**
 * Single phone-chrome standard for every mobile preview in admin
 * (SDUI simulator, review-queue PDP preview): neutral-950 bezel,
 * dynamic island, rounded background screen. One place to change
 * the device color — both previews stay identical.
 */
export function DeviceFrame({
  width,
  className,
  screenClassName,
  withIsland = true,
  children,
}: DeviceFrameProps) {
  return (
    <div
      style={width ? { width: `${width}px` } : undefined}
      className={cn(
        'relative rounded-[48px] bg-neutral-950 p-3.5 shadow-2xl ring-1 ring-white/10 transition-all duration-300',
        className,
      )}
    >
      {withIsland && (
        <div className="absolute left-1/2 top-4 z-30 flex h-5 w-28 -translate-x-1/2 items-center justify-end rounded-full bg-black px-3">
          <div className="h-2.5 w-2.5 rounded-full border border-neutral-700 bg-neutral-900" />
        </div>
      )}
      <div
        className={cn(
          'no-scrollbar relative w-full overflow-y-auto rounded-[36px] bg-background text-foreground',
          screenClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
