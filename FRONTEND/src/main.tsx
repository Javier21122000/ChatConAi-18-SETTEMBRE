import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import './styles.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('TxTr render error', error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="fatal-error"><h1>Qualcosa è andato storto.</h1><p>Ricarica TxTr per tornare alle tue conversazioni.</p><button className="button button-primary" onClick={() => window.location.reload()}>Ricarica</button></main>;
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><MotionConfig reducedMotion="user"><App /></MotionConfig></ErrorBoundary></React.StrictMode>,
);
