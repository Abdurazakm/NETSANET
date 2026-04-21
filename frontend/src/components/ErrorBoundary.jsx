import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="max-w-lg text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="mt-3 text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-muted p-4 text-left text-xs">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-6"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}