import { useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

import { MIN_FREE_DELIVERY_THRESHOLD } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { ConfirmDialog } from '@celebs/shared-ui/components/confirm-dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { DeliveryCity, ShippingRate } from '../api';
import {
  useCreateShippingRate,
  useDeleteShippingRate,
  useDeliveryCities,
  useShippingRates,
  useUpdateDeliveryCity,
  useUpdateShippingRate,
} from '../hooks';
import {
  type BandDraft,
  emptyBand,
  GENERAL_CITY,
  toRatePayload,
  validateBand,
  validateThreshold,
} from '../lib/rate-card';

import { useToast } from '@/hooks/use-toast';

/**
 * The delivery rate card: what a customer pays, and what the courier costs us.
 *
 * Two things are deliberately obvious on this screen. The customer charge and
 * the courier's own fee are separate columns, because a free-delivery threshold
 * makes them differ and the gap is a real cost. And every band shows the half-open
 * range it covers, because a band that overlaps another one silently prices at
 * whichever is cheaper - the API refuses the overlap, but the admin needs to see
 * why.
 */

const bandFromRate = (rate: ShippingRate): BandDraft => ({
  id: rate.id,
  cityId: rate.cityId ?? GENERAL_CITY,
  minWeightKg: rate.minWeightKg,
  maxWeightKg: rate.maxWeightKg,
  fee: rate.fee,
  codFee: rate.codFee,
});

export default function ShippingRatesPage() {
  const { toast } = useToast();
  const { data: rates, isLoading: ratesLoading } = useShippingRates();
  const { data: cities, isLoading: citiesLoading } = useDeliveryCities();

  const createRate = useCreateShippingRate();
  const updateRate = useUpdateShippingRate();
  const deleteRate = useDeleteShippingRate();
  const updateCity = useUpdateDeliveryCity();

  const [editing, setEditing] = useState<BandDraft | null>(null);
  const [bandErrors, setBandErrors] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ShippingRate | null>(null);
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, string>>({});

  if (ratesLoading || citiesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const activeCities: DeliveryCity[] = cities ?? [];

  const openCreate = () => {
    setBandErrors([]);
    setEditing(emptyBand());
  };

  const openEdit = (rate: ShippingRate) => {
    setBandErrors([]);
    setEditing(bandFromRate(rate));
  };

  const saveBand = async () => {
    if (!editing) return;

    const problems = validateBand(editing);
    setBandErrors(problems);
    if (problems.length > 0) return;

    const payload = toRatePayload(editing);

    try {
      if (editing.id) {
        await updateRate.mutateAsync({ id: editing.id, patch: payload });
        toast({ title: 'Rate band updated' });
      } else {
        await createRate.mutateAsync({ ...payload, isActive: true });
        toast({ title: 'Rate band added' });
      }
      setEditing(null);
    } catch (error) {
      // The server owns the overlap rule, so its message is the one the admin
      // needs to see rather than a generic failure.
      const message =
        error instanceof Error ? error.message : 'Could not save the rate band. Try again.';
      setBandErrors([message]);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deleteRate.mutateAsync(pendingDelete.id);
      toast({ title: 'Rate band removed' });
      setPendingDelete(null);
    } catch {
      toast({ title: 'Could not remove the rate band', variant: 'destructive' });
    }
  };

  const saveThreshold = async (city: DeliveryCity) => {
    const draft = thresholdDrafts[city.id];
    if (draft === undefined) return;

    const problem = validateThreshold(draft);
    if (problem) {
      toast({ title: problem, variant: 'destructive' });
      return;
    }
    const value = Number(draft.trim());

    try {
      await updateCity.mutateAsync({ id: city.id, patch: { freeDeliveryThreshold: value } });
      setThresholdDrafts((prev) => {
        const next = { ...prev };
        delete next[city.id];
        return next;
      });
      toast({ title: `Free delivery threshold updated for ${city.name}` });
    } catch {
      toast({ title: 'Could not update the threshold', variant: 'destructive' });
    }
  };

  const generalRates = (rates ?? []).filter((rate) => rate.cityId === null);
  const cityRates = (rates ?? []).filter((rate) => rate.cityId !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Rates"
        description="What customers pay for delivery, and what the courier charges us."
      />

      <Card>
        <CardHeader>
          <CardTitle>General rate card</CardTitle>
          <CardDescription>
            These bands apply to every city unless a city has a band of its own. A parcel with no
            matching band is charged the platform fallback fee instead of nothing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add band
            </Button>
          </div>
          <RateTable
            rates={generalRates}
            cities={activeCities}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            isMutating={deleteRate.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>City-specific rates</CardTitle>
          <CardDescription>
            A band for a city overrides the general one for the same weight. Overlapping bands in
            the same city are refused.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cityRates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No city-specific bands yet. Every city uses the general card.
            </p>
          ) : (
            <RateTable
              rates={cityRates}
              cities={activeCities}
              onEdit={openEdit}
              onDelete={setPendingDelete}
              isMutating={deleteRate.isPending}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Free delivery thresholds</CardTitle>
          <CardDescription>
            Delivery is waived when an order reaches this amount, measured before any discount. The
            courier is still paid, so the difference is absorbed by the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>District</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="w-48">Free over (NPR)</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCities.map((city) => {
                const draft = thresholdDrafts[city.id];
                const isDirty = draft !== undefined && Number(draft) !== city.freeDeliveryThreshold;

                return (
                  <TableRow key={city.id}>
                    <TableCell className="font-medium">{city.name}</TableCell>
                    <TableCell>{city.province}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {city.isValley ? 'Valley' : 'Outside valley'}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={MIN_FREE_DELIVERY_THRESHOLD}
                        step={1}
                        className="h-9"
                        value={draft ?? String(city.freeDeliveryThreshold)}
                        onChange={(event) =>
                          setThresholdDrafts((prev) => ({
                            ...prev,
                            [city.id]: event.target.value,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {isDirty ? (
                        <Button
                          size="sm"
                          onClick={() => saveThreshold(city)}
                          disabled={updateCity.isPending}
                        >
                          {updateCity.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          <span className="sr-only">Save threshold for {city.name}</span>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit rate band' : 'Add rate band'}</DialogTitle>
            <DialogDescription>
              The range is half-open: a 1 kg parcel matches [1, 5), not [0, 1).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="band-city">Applies to</Label>
              <Select
                value={editing?.cityId ?? GENERAL_CITY}
                onValueChange={(value) =>
                  setEditing((prev) => (prev ? { ...prev, cityId: value } : prev))
                }
              >
                <SelectTrigger id="band-city">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL_CITY}>Every city</SelectItem>
                  {activeCities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name} ({city.province})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="band-min">Minimum weight (kg)</Label>
                <Input
                  id="band-min"
                  type="number"
                  step="0.001"
                  value={editing?.minWeightKg ?? ''}
                  onChange={(event) =>
                    setEditing((prev) =>
                      prev ? { ...prev, minWeightKg: event.target.value } : prev,
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="band-max">Maximum weight (kg)</Label>
                <Input
                  id="band-max"
                  type="number"
                  step="0.001"
                  value={editing?.maxWeightKg ?? ''}
                  onChange={(event) =>
                    setEditing((prev) =>
                      prev ? { ...prev, maxWeightKg: event.target.value } : prev,
                    )
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="band-fee">Delivery fee (NPR)</Label>
                <Input
                  id="band-fee"
                  type="number"
                  step="0.01"
                  value={editing?.fee ?? ''}
                  onChange={(event) =>
                    setEditing((prev) => (prev ? { ...prev, fee: event.target.value } : prev))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="band-cod">Cash on delivery fee (NPR)</Label>
                <Input
                  id="band-cod"
                  type="number"
                  step="0.01"
                  value={editing?.codFee ?? ''}
                  onChange={(event) =>
                    setEditing((prev) => (prev ? { ...prev, codFee: event.target.value } : prev))
                  }
                />
              </div>
            </div>

            {bandErrors.length > 0 ? (
              <ul className="space-y-1 text-sm text-destructive">
                {bandErrors.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveBand} disabled={createRate.isPending || updateRate.isPending}>
              {createRate.isPending || updateRate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save band
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        destructive
        title="Remove this rate band?"
        description={
          pendingDelete
            ? `Parcels between ${pendingDelete.minWeightKg} and ${pendingDelete.maxWeightKg} kg will fall back to the platform fee until another band covers them.`
            : ''
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}

interface RateTableProps {
  rates: ShippingRate[];
  cities: DeliveryCity[];
  onEdit: (rate: ShippingRate) => void;
  onDelete: (rate: ShippingRate) => void;
  isMutating: boolean;
}

function RateTable({ rates, cities, onEdit, onDelete, isMutating }: RateTableProps) {
  if (rates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No bands yet. Until one is added, every order uses the platform fallback fee.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Weight band (kg)</TableHead>
          <TableHead>City</TableHead>
          <TableHead className="text-right">Customer pays</TableHead>
          <TableHead className="text-right">Courier charges</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rates.map((rate) => (
          <TableRow key={rate.id}>
            <TableCell className="font-medium">
              {rate.minWeightKg} – {rate.maxWeightKg}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {rate.cityId
                ? (cities.find((city) => city.id === rate.cityId)?.name ?? '—')
                : 'All cities'}
            </TableCell>
            <TableCell className="text-right">NPR {rate.fee}</TableCell>
            <TableCell className="text-right text-muted-foreground">
              NPR {Number(rate.fee) + Number(rate.codFee)}
              {Number(rate.codFee) > 0 ? (
                <span className="block text-xs">includes {rate.codFee} COD</span>
              ) : null}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => onEdit(rate)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isMutating}
                  onClick={() => onDelete(rate)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove band</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
