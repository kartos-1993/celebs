import { CheckCircle2, Circle } from 'lucide-react';

import type { ProductSidebarSection } from '../types';

import { revealedErrors } from './sidebar-section-helpers';

interface SidebarSectionRowProps {
  hasAttemptedSubmit: boolean;
  section: ProductSidebarSection;
  onSelect: (anchorId: string) => void;
}

/**
 * One checklist line: label, status icon, and the errors this section is
 * allowed to reveal. `untouched` and `complete` both render the muted `Circle`
 * vs the green check — the visual language is unchanged by the tri-state, only
 * WHICH errors are listed changes.
 */
export const SidebarSectionRow = ({
  hasAttemptedSubmit,
  section,
  onSelect,
}: SidebarSectionRowProps) => {
  const { hiddenCount, visible } = revealedErrors(section, hasAttemptedSubmit);
  const isDone = section.status === 'complete';
  const StatusIcon = isDone ? CheckCircle2 : Circle;
  const iconTone = isDone ? 'text-success' : 'text-muted-foreground/60';

  return (
    <div className="rounded-xl px-2 py-1.5 transition hover:bg-muted">
      <button
        type="button"
        data-testid={`sidebar-section-${section.key}`}
        onClick={() => onSelect(section.anchorId)}
        className="flex w-full items-start gap-2 text-left"
      >
        <StatusIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconTone}`} />
        <span
          className={`block truncate text-xs font-medium ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {section.label}
        </span>
      </button>

      {visible.length > 0 && (
        <ul className="ml-6 mt-0.5 space-y-0.5">
          {visible.map((message) => (
            <li key={message} title={message} className="text-xs leading-tight text-destructive">
              {message}
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onSelect(section.anchorId)}
          className="ml-6 text-xs font-medium leading-tight text-primary"
        >
          +{hiddenCount} more — view section
        </button>
      )}
    </div>
  );
};
