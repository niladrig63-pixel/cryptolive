import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
      return React.createElement('div', {
        style: { padding: '40px', color: '#ff3d71', fontFamily: 'monospace', fontSize: '14px', maxWidth: '600px', margin: '0 auto', marginTop: '40px' }
      },
        React.createElement('h2', { style: { color: '#e4e6eb', marginBottom: '12px' } }, 'CryptoLive — Render Error'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, String(this.state.error))
      );
    }
    return this.props.children;
  }
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(React.StrictMode, null,
      React.createElement(ErrorBoundary, null,
        React.createElement(App, null)
      )
    )
  );
} catch (err) {
  console.error('[CryptoLive] Fatal init error:', err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:40px;color:#ff3d71;font-family:monospace;font-size:14px;max-width:600px;margin:0 auto;margin-top:40px">
      <h2 style="color:#e4e6eb;margin-bottom:12px">CryptoLive — Init Error</h2>
      <pre style="white-space:pre-wrap;word-break:break-all">${err?.message || err}</pre>
    </div>`;
  }
}
