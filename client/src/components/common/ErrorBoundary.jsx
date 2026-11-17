import React, { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Aeterna CRM ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="status-page">
          <div className="status-card">
            <div className="status-icon text-danger">
              <AlertTriangle size={48} strokeWidth={1.8} />
            </div>
            <h2>Application Error</h2>
            <p className="status-desc">
              An unexpected error interrupted the application interface.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre
                style={{
                  textAlign: 'left',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  maxHeight: '140px',
                  overflow: 'auto',
                  marginBottom: '16px',
                }}
              >
                {this.state.error.toString()}
              </pre>
            )}
            <div className="status-actions">
              <Button variant="primary" onClick={this.handleReload}>
                Reload Workspace
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
