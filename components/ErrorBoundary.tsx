import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error message (e.g. "Sales Agent") */
  label?: string;
  /** If true, shows a compact inline error instead of a full-page one */
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches render/lifecycle errors in any subtree.
 *
 * Usage:
 *   <ErrorBoundary label="Meeting Room">
 *     <MeetingRoomPage />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary label="Sales Agent" inline>
 *     <AgentChatPanel agentId="sales" />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary: ${this.props.label || 'unknown'}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { label = 'Component', inline = false } = this.props;
    const msg = this.state.error?.message || 'An unexpected error occurred.';

    if (inline) {
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
          <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">{label} encountered an error</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">{msg}</p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">{label} crashed</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">{msg}</p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 mx-auto bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }
}
