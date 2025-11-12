import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Debug log to help investigate issues in production
    console.error("UI_ERROR_BOUNDARY", { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold text-destructive">Something went wrong.</h2>
          <p className="text-sm text-muted-foreground mt-2">Check console for details. Try refreshing the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}


