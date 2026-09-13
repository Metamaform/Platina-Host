import { Buffer } from 'buffer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ErrorBoundary } from './ErrorBoundary';

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

// Polyfill storage to avoid crashes in restricted iframes
function createSafeStorage(storage: Storage | undefined): Storage {
  let fallback: Record<string, string> = {};
  return {
    getItem: (key: string) => {
      try { return storage?.getItem(key) ?? fallback[key] ?? null; }
      catch(e) { return fallback[key] ?? null; }
    },
    setItem: (key: string, value: string) => {
      try { storage?.setItem(key, value); } catch(e) {}
      fallback[key] = value;
    },
    removeItem: (key: string) => {
      try { storage?.removeItem(key); } catch(e) {}
      delete fallback[key];
    },
    clear: () => {
      try { storage?.clear(); } catch(e) {}
      fallback = {};
    },
    key: (index: number) => {
      try { return storage?.key(index) ?? Object.keys(fallback)[index] ?? null; }
      catch(e) { return Object.keys(fallback)[index] ?? null; }
    },
    get length() {
      try { return storage?.length ?? Object.keys(fallback).length; }
      catch(e) { return Object.keys(fallback).length; }
    }
  };
}
try {
  let _ls = window.localStorage;
  let _ss = window.sessionStorage;
  Object.defineProperty(window, 'localStorage', { value: createSafeStorage(_ls), writable: true });
  Object.defineProperty(window, 'sessionStorage', { value: createSafeStorage(_ss), writable: true });
  
  // Disable indexedDB if it's crashing
  try {
    let _idb = window.indexedDB;
  } catch (e) {
    Object.defineProperty(window, 'indexedDB', { value: null, writable: true });
  }
} catch (e) {
  console.warn("Could not polyfill storage", e);
}

const manifestUrl = window.location.origin + '/tonconnect-manifest.json';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <App />
      </TonConnectUIProvider>
    </ErrorBoundary>
  </StrictMode>,
);
