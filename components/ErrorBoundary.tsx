'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * React Error Boundary 组件
 * 捕获子组件树中的 JavaScript 错误
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误到 console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 更新状态
    this.setState({ errorInfo });
    
    // TODO: 在生产环境中上报到 Sentry 或其他错误追踪服务
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误页面
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto p-8">
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    An unexpected error occurred
                  </p>
                </div>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-4 p-3 bg-muted rounded text-xs font-mono text-muted-foreground overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Try again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Reload page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 用于包裹异步组件的 Error Boundary
 */
export function AsyncErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive">Failed to load component</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
