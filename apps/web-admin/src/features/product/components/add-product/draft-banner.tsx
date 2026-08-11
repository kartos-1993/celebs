import { memo } from 'react';
import { FileClock, RotateCcw } from 'lucide-react';
import { Button } from '@celebs/shared-ui/components/button';

interface DraftBannerProps {
    restoredDraftAt: string;
    onDiscard: () => void;
}

export const DraftBanner = memo(({ restoredDraftAt, onDiscard }: DraftBannerProps) => (
    <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
            <FileClock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                    Saved draft auto-restored
                </p>
                <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                    Loaded unfinished draft saved on {new Date(restoredDraftAt).toLocaleString()}.
                </p>
            </div>
        </div>
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDiscard}
            className="h-8 rounded-xl border-amber-300 bg-white/90 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/80"
        >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
            Discard Draft & Start Fresh
        </Button>
    </div>
));