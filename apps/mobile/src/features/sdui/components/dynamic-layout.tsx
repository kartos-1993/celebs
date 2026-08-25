import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { DynamicWidget } from '../types';

import { WidgetErrorBoundary } from './widget-error-boundary';
import { renderSDUIWidget, SDUIActionHandlers } from './widget-registry';

export interface DynamicLayoutProps {
  widgets?: DynamicWidget[];
  handlers?: SDUIActionHandlers;
  refreshKey?: number;
}

export function DynamicLayout({ widgets = [], handlers, refreshKey = 0 }: DynamicLayoutProps) {
  if (!widgets || widgets.length === 0) {
    return null;
  }

  // Skip widgets hidden from the storefront, sort remaining deterministically
  const sortedWidgets = [...widgets]
    .filter((widget) => widget.isActive !== false)
    .sort((a, b) => a.order - b.order);

  return (
    <View style={styles.container}>
      {sortedWidgets.map((widget) => {
        const customStyle = widget.styling
          ? {
              paddingVertical: widget.styling.paddingVertical,
              paddingHorizontal: widget.styling.paddingHorizontal,
              backgroundColor: widget.styling.backgroundColor,
              marginBottom: widget.styling.marginBottom,
              borderRadius: widget.styling.borderRadius,
            }
          : undefined;

        return (
          <WidgetErrorBoundary key={widget.id} widgetId={widget.id} widgetType={widget.type}>
            <View style={customStyle}>{renderSDUIWidget(widget, handlers, refreshKey)}</View>
          </WidgetErrorBoundary>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
