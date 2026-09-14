import React from 'react';
import { Search } from 'lucide-react';

import { Input } from '@celebs/shared-ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import type { ReviewStatus } from '../types';

interface ReviewFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ReviewStatus | 'ALL';
  onStatusChange: (status: ReviewStatus | 'ALL') => void;
  rating?: number;
  onRatingChange: (rating?: number) => void;
}

export function ReviewFilterToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  rating,
  onRatingChange,
}: ReviewFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by review text or product..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(val) => onStatusChange(val as ReviewStatus | 'ALL')}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING_MODERATION">Pending Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={rating ? String(rating) : 'ALL'}
          onValueChange={(val) => onRatingChange(val === 'ALL' ? undefined : Number(val))}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Filter rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
