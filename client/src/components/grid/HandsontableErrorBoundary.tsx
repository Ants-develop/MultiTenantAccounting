import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary to catch Handsontable errors during zoom/resize
 * Prevents the entire app from crashing due to Handsontable internal errors
 */
export class HandsontableErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Handsontable Error Boundary caught error:', error, errorInfo);
    // Auto-recover after a short delay
    setTimeout(() => {
      this.setState({ hasError: false, error: null });
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      // Return children anyway to prevent blank screen
      return this.props.children;
    }
    return this.props.children;
  }
}

