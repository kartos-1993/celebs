import { useState } from 'react';
import { X, XCircle } from 'lucide-react';
import { Button } from '@celebs/shared-ui/components/button';
import { Textarea } from '@celebs/shared-ui/components/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { useToast } from '@/hooks/use-toast';
import type { ReviewProductRequestPayload } from '../../api';
import { FLAGGED_FIELDS_OPTIONS, REJECTION_CATEGORIES } from './constants';

interface RejectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isSubmitting: boolean;
    onSubmit: (payload: ReviewProductRequestPayload) => void;
}

export function RejectionDialog({
    open,
    onOpenChange,
    isSubmitting,
    onSubmit,
}: RejectionDialogProps) {
    const { toast } = useToast();
    const [selectedCategory, setSelectedCategory] = useState<string>(REJECTION_CATEGORIES[0].id);
    const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
    const [flaggedFields, setFlaggedFields] = useState<string[]>(
        REJECTION_CATEGORIES[0].suggestedFields,
    );
    const [rejectionNote, setRejectionNote] = useState('');

    const activeCategory = REJECTION_CATEGORIES.find((entry) => entry.id === selectedCategory);

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        const category = REJECTION_CATEGORIES.find((entry) => entry.id === categoryId);
        if (category) {
            setSelectedSubcategories([]);
            setFlaggedFields(category.suggestedFields);
        }
    };

    const toggleSubcategory = (subcategory: string) => {
        setSelectedSubcategories((previous) =>
            previous.includes(subcategory)
                ? previous.filter((item) => item !== subcategory)
                : [...previous, subcategory],
        );
    };

    const toggleFlaggedField = (fieldId: string) => {
        setFlaggedFields((previous) =>
            previous.includes(fieldId)
                ? previous.filter((item) => item !== fieldId)
                : [...previous, fieldId],
        );
    };

    const handleSubmit = () => {
        if (!selectedCategory) {
            toast({
                title: 'Category required',
                description: 'Please select a primary rejection reason category.',
                variant: 'destructive',
            });
            return;
        }
        if (!rejectionNote.trim() && selectedSubcategories.length === 0) {
            toast({
                title: 'Feedback required',
                description:
                    'Please select at least one issue subcategory or type detailed feedback for the vendor.',
                variant: 'destructive',
            });
            return;
        }
        onSubmit({
            action: 'reject',
            rejectionCategory: selectedCategory,
            rejectionSubcategories: selectedSubcategories,
            rejectionFields: flaggedFields,
            note: rejectionNote.trim(),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <XCircle className="w-5 h-5" /> Reject Product Listing
                    </DialogTitle>
                    <DialogDescription>
                        Select quality control issues and specify required seller actions. A structured
                        notification will be sent to the vendor.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-3 text-sm">
                    {/* Primary category */}
                    <div>
                        <label className="font-semibold block mb-1 text-foreground">
                            Primary Rejection Category <span className="text-destructive">*</span>
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {REJECTION_CATEGORIES.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategory checklist */}
                    <div>
                        <label className="font-semibold block mb-2 text-foreground">
                            Specific Issue Checklists (select all that apply)
                        </label>
                        <div className="space-y-2 bg-muted/30 p-3 rounded-lg border">
                            {(activeCategory?.subcategories ?? []).map((subcategory) => (
                                <label
                                    key={subcategory}
                                    className="flex items-start gap-2 cursor-pointer text-xs leading-tight"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedSubcategories.includes(subcategory)}
                                        onChange={() => toggleSubcategory(subcategory)}
                                        className="mt-0.5 rounded border-input"
                                    />
                                    <span>{subcategory}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Flagged fields */}
                    <div>
                        <label className="font-semibold block mb-2 text-foreground">
                            Flagged Fields (highlighted in seller dashboard)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {FLAGGED_FIELDS_OPTIONS.map((field) => {
                                const isSelected = flaggedFields.includes(field.id);
                                return (
                                    <button
                                        key={field.id}
                                        type="button"
                                        onClick={() => toggleFlaggedField(field.id)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-all ${isSelected
                                                ? 'bg-destructive text-destructive-foreground border-destructive font-medium'
                                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                            }`}
                                    >
                                        {field.label} {isSelected ? '✓' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Remediation note */}
                    <div>
                        <label className="font-semibold block mb-1 text-foreground">
                            Actionable Seller Remediation Notes
                        </label>
                        <Textarea
                            placeholder="E.g., Please upload higher resolution photos without watermarks. Update the size chart to include chest measurements in cm."
                            value={rejectionNote}
                            onChange={(e) => setRejectionNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="gap-1"
                    >
                        <X className="w-4 h-4" /> Submit Rejection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}