'use client';

import React from 'react';

interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  children: React.ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  reloadLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.resetErrorBoundary} />;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">
            {this.props.errorTitle ?? 'Something went wrong'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {this.props.errorDescription ?? 'An error occurred while loading this component'}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="text-xs text-destructive bg-muted p-2 rounded mb-4 max-w-full overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            onClick={this.resetErrorBoundary}
          >
            {this.props.reloadLabel ?? 'Reload'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
