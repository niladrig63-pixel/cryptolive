import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { startWebSocket } from './services/websocket';

// Error boundary to catch render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[CryptoLive] React error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#ff3d71', fontFamily: 'monospace', fontSize: '14px', maxWidth: '600px', margin: '0 auto', marginTop: '40px' }}>
          <h2 style={{ color: '#e4e6eb', marginBottom: '12px' }}>CryptoLive — Render Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Start WebSocket BEFORE React renders — completely decoupled
startWebSocket();

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
