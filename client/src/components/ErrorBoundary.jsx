
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("ErrorBoundary caught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
                    <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-2xl border border-red-100">
                        <h2 className="text-2xl font-bold mb-2 text-red-600">Something went wrong</h2>
                        <p className="mb-6 text-gray-600">The application encountered a critical error and could not render.</p>

                        <div className="mb-6">
                            <p className="font-semibold text-gray-800 mb-2">Error Details:</p>
                            <div className="whitespace-pre-wrap text-xs font-mono bg-red-50 p-4 rounded-lg border border-red-100 overflow-auto max-h-[300px] text-red-900">
                                {this.state.error && this.state.error.toString()}
                                <hr className="my-2 border-red-200" />
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.href = '/login';
                                }}
                                className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
                            >
                                Clear Data & Login
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md font-semibold"
                            >
                                Reload Application
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
