import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@celebs/shared-ui/components/badge';

export function QualityBadge({ score }: { score?: number }) {
    const value = score ?? 0;
    if (value >= 85) {
        return (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
                <Sparkles className="w-3 h-3" /> QC {value}% High
            </Badge>
        );
    }
    if (value >= 70) {
        return (
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> QC {value}% Good
            </Badge>
        );
    }
    return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold">
            <AlertCircle className="w-3 h-3" /> QC {value}% Action Needed
        </Badge>
    );
}