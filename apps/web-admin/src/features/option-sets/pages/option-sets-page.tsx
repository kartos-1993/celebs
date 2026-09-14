import React, { useCallback, useEffect, useState } from 'react';
import { Edit, Layers, Plus, Trash2, X } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { createOptionSet, deleteOptionSet, fetchOptionSets, updateOptionSet } from '../api';
import type { OptionSet } from '../types';

import { FilterBar, FilterSearch } from '@/components/filter-bar';
import { PageLoader } from '@/components/page-loader';
import { useToast } from '@/hooks/use-toast';

export default function OptionSetsPage() {
  const { toast } = useToast();
  const [optionSets, setOptionSets] = useState<OptionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<OptionSet | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [valuesInput, setValuesInput] = useState<string[]>([]);
  const [newValText, setNewValText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<OptionSet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchOptionSets();
      setOptionSets(data);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast({
        title: 'Error loading option sets',
        description: errObj.message || 'Failed to fetch option sets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  const handleOpenCreate = () => {
    setEditingSet(null);
    setNameInput('');
    setDisplayNameInput('');
    setDescriptionInput('');
    setValuesInput([]);
    setNewValText('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (set: OptionSet) => {
    setEditingSet(set);
    setNameInput(set.name);
    setDisplayNameInput(set.displayName || set.name);
    setDescriptionInput(set.description || '');
    setValuesInput([...(set.values || [])]);
    setNewValText('');
    setIsDialogOpen(true);
  };

  const handleAddValue = () => {
    const trimmed = newValText.trim();
    if (!trimmed) return;
    if (!valuesInput.includes(trimmed)) {
      setValuesInput([...valuesInput, trimmed]);
    }
    setNewValText('');
  };

  const handleRemoveValue = (valToRemove: string) => {
    setValuesInput(valuesInput.filter((v) => v !== valToRemove));
  };

  const handleSave = async () => {
    if (!nameInput.trim()) {
      toast({ title: 'Validation Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      setIsSaving(true);
      if (editingSet) {
        await updateOptionSet(editingSet.id, {
          name: nameInput.trim(),
          displayName: displayNameInput.trim() || nameInput.trim(),
          description: descriptionInput.trim() || undefined,
          values: valuesInput,
        });
        toast({ title: 'Option set updated', description: `Updated ${nameInput}` });
      } else {
        await createOptionSet({
          name: nameInput.trim(),
          displayName: displayNameInput.trim() || nameInput.trim(),
          description: descriptionInput.trim() || undefined,
          values: valuesInput,
        });
        toast({ title: 'Option set created', description: `Created ${nameInput}` });
      }
      setIsDialogOpen(false);
      loadSets();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast({
        title: 'Save failed',
        description: errObj.message || 'Failed to save option set',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteOptionSet(deleteTarget.id);
      toast({ title: 'Option set deleted', description: `Deleted ${deleteTarget.name}` });
      setDeleteTarget(null);
      loadSets();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast({
        title: 'Delete failed',
        description: errObj.message || 'Failed to delete option set',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSets = optionSets.filter((set) => {
    const query = searchQuery.toLowerCase();
    const nameMatch =
      set.name.toLowerCase().includes(query) ||
      (set.displayName || '').toLowerCase().includes(query);
    const valueMatch = (set.values || []).some((v) => v.toLowerCase().includes(query));
    return nameMatch || valueMatch;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Option Sets Manager
          </span>
        }
        description="Manage global color, size, and variant option sets dynamically in production."
        actions={
          <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Create Option Set
          </Button>
        }
      />

      {/* Search & Filter */}
      <FilterBar>
        <FilterSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search option sets or values (e.g. Coffee Brown, 3XL)..."
        />
      </FilterBar>

      {/* Loading & Content */}
      {loading ? (
        <PageLoader />
      ) : filteredSets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground space-y-2">
          <p className="text-base font-semibold">No option sets found</p>
          <p className="text-xs">
            Try adjusting your search or click "Create Option Set" to add one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSets.map((set) => (
            <div
              key={set.id}
              className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {set.displayName || set.name}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">Key: {set.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(set)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>

                  {/* Protect default core option sets from accidental deletion */}
                  {!['Basic Colors', 'Alpha Sizes (XXS-5XL)', 'Numeric Sizes (26-46)'].includes(
                    set.name,
                  ) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(set)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Option Values ({set.values?.length || 0})</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {(set.values || []).map((val) => (
                    <Badge key={val} variant="secondary">
                      {val}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSet ? 'Edit Option Set' : 'Create Option Set'}</DialogTitle>
            <DialogDescription>
              {editingSet
                ? 'Update values and configuration for this option set.'
                : 'Define reusable attribute option values for category schemas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Option Set Name (Key)</Label>
              <Input
                placeholder="e.g. Basic Colors or Gemstone Cuts"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Title</Label>
              <Input
                placeholder="e.g. Basic Colors"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Values ({valuesInput.length})</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type new value (e.g. Cyber Lime #DFFF00) and press Enter"
                  value={newValText}
                  onChange={(e) => setNewValText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddValue();
                    }
                  }}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddValue}
                  className="shrink-0 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto border rounded-md p-2 bg-muted/10 mt-2">
                {valuesInput.map((val) => (
                  <Badge key={val} variant="secondary" className="text-xs gap-1 py-1">
                    {val}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveValue(val)}
                      className="h-3.5 w-3.5 p-0 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                {valuesInput.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No values added yet.</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Spinner size="sm" /> : editingSet ? 'Save Changes' : 'Create Option Set'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Option Set</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong className="text-foreground">{deleteTarget?.name}</strong>? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
