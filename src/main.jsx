import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import keycloak from './auth/keycloak';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Dhana Lakshmi Financial Platform</div>
      <div style={{ color: '#94a3b8' }}>Authenticating with Keycloak SSO...</div>
    </div>
  </div>
);

// Clear stale error hash from URL before Keycloak init if present
if (window.location.hash && (window.location.hash.includes('error=') || window.location.hash.includes('error_description='))) {
  console.warn('Clearing stale error hash from URL before Keycloak init:', window.location.hash);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

keycloak.init({
  onLoad: 'login-required',
  checkLoginIframe: false,
  pkceMethod: 'S256',
  redirectUri: window.location.origin + '/'
}).then((authenticated) => {
  if (authenticated) {
    // Intercept window.fetch to automatically attach Keycloak Bearer token and refresh if near expiry
    const originalFetch = window.fetch;
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : (input?.url || '');
      if (url.startsWith('/api') || url.includes('/api/')) {
        try {
          if (keycloak && keycloak.token) {
            await keycloak.updateToken(30);
          }
        } catch (e) {
          console.warn('Silent Keycloak token refresh failed:', e);
        }

        let headers;
        if (init && init.headers) {
          headers = new Headers(init.headers);
        } else if (typeof input === 'object' && input.headers) {
          headers = new Headers(input.headers);
        } else {
          headers = new Headers();
        }

        if (keycloak && keycloak.token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${keycloak.token}`);
        }

        return originalFetch(input, { ...init, headers });
      }
      return originalFetch(input, init);
    };

    root.render(
      <React.StrictMode>
        <App keycloak={keycloak} />
      </React.StrictMode>
    );
  } else {
    keycloak.login({ redirectUri: window.location.origin + '/' });
  }
}).catch((err) => {
  console.error('Keycloak authentication failed', err);
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  root.render(
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: '#f87171', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Authentication Required</div>
        <div style={{ color: '#94a3b8', marginBottom: '16px' }}>Connecting to your Gurukool SSO session...</div>
        <button 
          onClick={() => {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            keycloak.login({ redirectUri: window.location.origin + '/' });
          }} 
          style={{ padding: '8px 20px', background: '#10B981', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Sign In with Keycloak
        </button>
      </div>
    </div>
  );
});
