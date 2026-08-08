import React, { useState, useEffect } from 'react';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@celebs/shared-ui/components/dialog';
import { Label } from '@celebs/shared-ui/components/label';
import { Plus, Search, Trash2, Edit, Layers, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchOptionSets, createOptionSet, updateOptionSet, deleteOptionSet } from '../api';
import type { OptionSet } from '../types';

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

  const loadSets = async () => {
    try {
      setLoading(true);
      const data = await fetchOptionSets();
      setOptionSets(data);
    } catch (err: any) {
      toast({
        title: 'Error loading option sets',
        description: err.message || 'Failed to fetch option sets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSets();
  }, []);

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
    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err.message || 'Failed to save option set',
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
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err.message || 'Failed to delete option set',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSets = optionSets.filter((set) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = set.name.toLowerCase().includes(query) || (set.displayName || '').toLowerCase().includes(query);
    const valueMatch = (set.values || []).some((v) => v.toLowerCase().includes(query));
    return nameMatch || valueMatch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Option Sets Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage global color, size, and variant option sets dynamically in production.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Create Option Set
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search option sets or values (e.g. Coffee Brown, 3XL)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Loading & Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground space-y-2">
          <p className="text-base font-semibold">No option sets found</p>
          <p className="text-xs">Try adjusting your search or click "Create Option Set" to add one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSets.map((set) => (
            <div
              key={set.id}
              className="rounded-xl border bg-card text-card-foreground p-5 shadow-2xs space-y-4 hover:shadow-xs transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="font-bold text-base text-foreground">{set.displayName || set.name}</h3>
                  <span className="text-xs text-muted-foreground font-mono">Key: {set.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(set)} className="h-8 w-8">
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>

                  {/* Protect default core option sets from accidental deletion */}
                  {!['Basic Colors', 'Alpha Sizes (XXS-5XL)', 'Numeric Sizes (26-46)'].includes(set.name) && (
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(set)} className="h-8 w-8 text-rose-500 hover:text-rose-600">
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
                    <Badge
                      key={val}
                      variant="outline"
                      className="text-xs font-normal bg-muted/30 border-muted"
                    >
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
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Option Set Name (Key)</Label>
              <Input
                placeholder="e.g. Basic Colors or Gemstone Cuts"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Display Title</Label>
              <Input
                placeholder="e.g. Basic Colors"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Values ({valuesInput.length})</Label>
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
                <Button type="button" variant="secondary" onClick={handleAddValue} className="shrink-0 gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto border rounded-md p-2 bg-muted/10 mt-2">
                {valuesInput.map((val) => (
                  <Badge key={val} variant="secondary" className="text-xs gap-1 py-1">
                    {val}
                    <button type="button" onClick={() => handleRemoveValue(val)} className="hover:text-rose-500">
                      <X className="h-3 w-3" />
                    </button>
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
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingSet ? 'Save Changes' : 'Create Option Set'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Option Set</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
