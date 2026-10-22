import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-coffee-50">
          <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-8 w-full max-w-md text-center">
            <AlertTriangle className="w-10 h-10 text-gold-dark mx-auto mb-4" />
            <h1 className="text-xl font-bold text-coffee-900 mb-2">Something went wrong</h1>
            <p className="text-charcoal/60 text-sm mb-6">
              An unexpected error occurred while loading this page. Please try again.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-6 break-words">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-coffee-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-coffee-800 transition"
            >
              <RefreshCw className="w-4 h-4" /> Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
