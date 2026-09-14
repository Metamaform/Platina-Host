import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logToServer } from './lib/logger';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    logToServer('error', `React ErrorBoundary: ${error.message}`, error.stack + '\n' + errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#202020', color: '#ff5555', zIndex: 9999, position: 'relative', overflow: 'auto', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#fff' }}>Something went wrong</h2>
          <p style={{ fontWeight: 'bold' }}>{this.state.error?.toString()}</p>
          <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', color: '#ffaaaa' }}>{this.state.errorInfo?.componentStack}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px', background: '#2E8FFF', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}
