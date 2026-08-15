import React from 'react';

import { QuickFilterConfig, QuickFilterItem } from '../types';

import { AvatarScrollFilter } from './filters/avatar-scroll-filter';
import { ChipListFilter } from './filters/chip-list-filter';
import { ColorSwatchFilter } from './filters/color-swatch-filter';

interface QuickFilterRendererProps {
  config: QuickFilterConfig;
  selectedItem: string | null;
  onSelectItem: (item: QuickFilterItem) => void;
}

export const QuickFilterRenderer: React.FC<QuickFilterRendererProps> = ({
  config,
  selectedItem,
  onSelectItem,
}) => {
  if (!config || !config.items || config.items.length === 0) {
    return null;
  }

  switch (config.displayAs) {
    case 'avatar_scroll':
      return (
        <AvatarScrollFilter
          items={config.items}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
        />
      );

    case 'color_swatch':
      return (
        <ColorSwatchFilter
          items={config.items}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
        />
      );

    case 'chip_list':
    default:
      return (
        <ChipListFilter
          items={config.items}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
        />
      );
  }
};
