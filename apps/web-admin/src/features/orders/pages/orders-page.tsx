import React from 'react';

import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { FulfillmentDialog } from '../components/fulfillment-dialog';
import { OrderCards } from '../components/order-cards';
import { OrderFilters } from '../components/order-filters';
import { OrderTable } from '../components/order-table';
import { useOrdersPage } from '../hooks/use-orders-page';
import { ADMIN_ORDER_STATUS_TABS, VENDOR_STATUS_TABS } from '../lib/order-constants';

import { DataTablePagination } from '@/components/data-table-pagination';

const Orders: React.FC = () => {
  const s = useOrdersPage();
  const tabs = s.mode === 'vendor' ? VENDOR_STATUS_TABS : ADMIN_ORDER_STATUS_TABS;

  return (
    <div className="space-y-6">
      <PageHeader title={s.mode === 'vendor' ? 'Vendor Order Fulfillment' : 'Platform Orders'} />
      <OrderFilters
        tabs={tabs}
        activeTab={s.activeTab}
        onTabChange={s.handleTabChange}
        searchQuery={s.searchQuery}
        onSearchChange={s.handleSearchChange}
      />
      <OrderTable
        rows={s.list.filteredRows}
        isLoading={s.list.isLoading}
        isFetching={s.list.isFetching}
        mode={s.mode}
        onUpdate={s.dialog.openFor}
      />
      <OrderCards
        rows={s.list.filteredRows}
        isLoading={s.list.isLoading}
        isFetching={s.list.isFetching}
        mode={s.mode}
        onUpdate={s.dialog.openFor}
      />
      <DataTablePagination
        page={s.page}
        totalPages={s.list.totalPages}
        total={s.list.total}
        pageSize={s.pageSize}
        onPageChange={s.setPage}
        onPageSizeChange={s.setPageSize}
      />
      <FulfillmentDialog
        open={s.dialog.isOpen}
        onOpenChange={s.dialog.setIsOpen}
        item={s.dialog.selectedItem}
        newStatus={s.dialog.newStatus}
        onNewStatusChange={s.handleNewStatusChange}
        courier={s.dialog.courier}
        onCourierChange={s.dialog.setCourier}
        trackingNo={s.dialog.trackingNo}
        onTrackingChange={s.dialog.setTrackingNo}
        canManage={s.canManage}
        canSettleFinance={s.canSettleFinance}
        fulfillmentPending={s.fulfillmentMutation.isPending}
        dispatchPending={s.dispatchMutation.isPending}
        settlePending={s.settleCodMutation.isPending}
        onFulfill={s.handleFulfill}
        onDispatch={s.handleDispatch}
        onSettle={s.handleSettle}
      />
    </div>
  );
};

export default Orders;
