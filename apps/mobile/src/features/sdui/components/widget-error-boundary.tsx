import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  widgetId?: string;
  widgetType?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.warn(
        `[SDUI] Widget Error in <${this.props.widgetType || 'Unknown'} (id: ${this.props.widgetId})>:`,
        error,
        errorInfo,
      );
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (__DEV__) {
        return (
          <View style={styles.devErrorCard}>
            <Text style={styles.devErrorTitle}>
              [SDUI Widget Error] {this.props.widgetType || 'Widget'}
            </Text>
            <Text style={styles.devErrorMessage}>
              {this.state.error?.message || 'Unknown render failure'}
            </Text>
          </View>
        );
      }

      // In production, gracefully render nothing so the rest of the feed remains flawless
      return null;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  devErrorCard: {
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  devErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  devErrorMessage: {
    fontSize: 11,
    color: '#B91C1C',
  },
});
