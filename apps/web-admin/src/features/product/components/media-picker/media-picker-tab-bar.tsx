import { TabsList, TabsTrigger } from '@celebs/shared-ui/components/tabs';

/**
 * The library/upload tab strip, split out of `MediaPickerDialog` so the dialog
 * shell stays a layout and not a control surface.
 *
 * Extracted verbatim — the classes, the copy ("Selection limit reached (N)"),
 * and the `activeTab === 'library'` gate on the notice are all unchanged. The
 * notice deliberately appears only on the library tab: the limit is enforced by
 * the picker, and repeating it over an empty upload dropzone is noise.
 *
 * No `onTabChange` here: Radix's `Tabs` root owns the value, and the triggers
 * are what move it. Passing a change handler here would be a second, redundant
 * path to the same state.
 */
export type MediaPickerTab = 'library' | 'upload';

interface MediaPickerTabBarProps {
  activeTab: MediaPickerTab;
  selectedCount: number;
  maxSelect: number;
}

export function MediaPickerTabBar({ activeTab, selectedCount, maxSelect }: MediaPickerTabBarProps) {
  const showLimitNotice = activeTab === 'library' && selectedCount >= maxSelect;

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 bg-muted/30 px-4 py-2">
      <TabsList className="h-8">
        <TabsTrigger value="library" className="h-7 px-3 text-xs">
          Library
        </TabsTrigger>
        <TabsTrigger value="upload" className="h-7 px-3 text-xs">
          Upload New
        </TabsTrigger>
      </TabsList>
      {showLimitNotice ? (
        <span className="text-xs font-medium text-warning">
          Selection limit reached ({maxSelect})
        </span>
      ) : null}
    </div>
  );
}
