import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl shadow-red-500/10">
            <div className="flex items-center gap-4 mb-6 text-red-500">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Something went wrong</h1>
            </div>
            
            <p className="text-slate-400 mb-6 font-medium leading-relaxed">
              The application encountered a critical error during initialization. This often happens due to missing environment variables or library conflicts.
            </p>

            <div className="bg-black/40 rounded-xl p-6 border border-white/5 font-mono text-sm overflow-auto max-h-[300px]">
              <div className="text-red-400 font-bold mb-2">{this.state.error?.name}: {this.state.error?.message}</div>
              <pre className="text-slate-500 leading-tight">
                {this.state.error?.stack}
              </pre>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Try Reloading Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
