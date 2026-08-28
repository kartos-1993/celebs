import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { showToast } from '@/components/toast/toast';
import {
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
} from '@/features/addresses/hooks/use-addresses';
import type { AddressDraft, SavedAddress } from '@/features/addresses/types';

export function useCheckoutAddressForm(addresses: SavedAddress[]) {
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  const effectiveSelectedId = useMemo(() => {
    if (addresses.length === 0) return null;
    if (selectedAddressId && addresses.some((a) => a.id === selectedAddressId)) {
      return selectedAddressId;
    }
    const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
    return preferred ? preferred.id : null;
  }, [addresses, selectedAddressId]);

  const handleSubmitAddress = async (draft: AddressDraft) => {
    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({ addressId: editingAddress.id, draft });
      } else {
        await createAddress.mutateAsync(draft);
      }
      showToast('Address saved', { type: 'success' });
      setFormVisible(false);
      setEditingAddress(null);
    } catch (err: unknown) {
      showToast(
        (err as { message?: string })?.message || 'Could not save address. Please try again.',
        { type: 'error' },
      );
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert('Delete Address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteAddress.mutate(addressId, {
            onSuccess: () => {
              showToast('Address deleted', { type: 'info' });
              setFormVisible(false);
              setEditingAddress(null);
            },
            onError: (err: Error) =>
              showToast(err.message || 'Cannot delete address', { type: 'error' }),
          });
        },
      },
    ]);
  };

  const openAdd = () => {
    setEditingAddress(null);
    setFormVisible(true);
  };

  const openEdit = (address: SavedAddress) => {
    setEditingAddress(address);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingAddress(null);
  };

  return {
    selectedAddressId,
    setSelectedAddressId,
    effectiveSelectedId,
    formVisible,
    editingAddress,
    isSavingAddress: createAddress.isPending || updateAddress.isPending || deleteAddress.isPending,
    openAdd,
    openEdit,
    closeForm,
    handleSubmitAddress,
    handleDeleteAddress,
  };
}
