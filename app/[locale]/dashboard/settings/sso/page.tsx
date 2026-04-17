'use client';

import { useState, useEffect } from 'react';

interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oauth2' | 'oidc';
  config: Record<string, string>;
  enabled: boolean;
}

interface SSOConnection {
  id: string;
  teamId: string;
  providerId: string;
  domain: string;
  config: Record<string, string>;
  createdAt: number;
}

export default function SSOPage() {
  const [teamId, setTeamId] = useState('');
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [connection, setConnection] = useState<SSOConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [selectedProvider, setSelectedProvider] = useState('');
  const [domain, setDomain] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [discoveryUrl, setDiscoveryUrl] = useState('');
  const [ssoUrl, setSsoUrl] = useState('');
  const [certificate, setCertificate] = useState('');

  useEffect(() => {
    const storedTeamId = localStorage.getItem('currentTeamId') || 'team-default';
    setTeamId(storedTeamId);
    loadProviders();
    loadConnection(storedTeamId);
  }, []);

  async function loadProviders() {
    try {
      const res = await fetch('/v1/sso/providers');
      const data: { providers?: SSOProvider[] } = await res.json();
      if (data.providers) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadConnection(tid: string) {
    try {
      const res = await fetch(`/v1/teams/${tid}/sso/connection`);
      const data: { connection?: SSOConnection } = await res.json();
      if (data.connection) {
        setConnection(data.connection || null);
        setSelectedProvider(data.connection.providerId);
        setDomain(data.connection.domain);
        setClientId(data.connection.config.clientId || '');
        setClientSecret(data.connection.config.clientSecret || '');
        setDiscoveryUrl(data.connection.config.discoveryUrl || '');
        setSsoUrl(data.connection.config.ssoUrl || '');
        setCertificate(data.connection.config.certificate || '');
      }
    } catch (err) {
      console.error('Failed to load connection:', err);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const provider = providers.find(p => p.id === selectedProvider);
    const config: Record<string, string> = {};

    if (provider?.type === 'oidc' || provider?.type === 'oauth2') {
      config.clientId = clientId;
      config.clientSecret = clientSecret;
      config.discoveryUrl = discoveryUrl;
    } else if (provider?.type === 'saml') {
      config.ssoUrl = ssoUrl;
      config.certificate = certificate;
    }

    try {
      if (!connection) {
        const res = await fetch('/v1/sso/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            providerId: selectedProvider,
            domain,
            config,
          }),
        });
        
        const data: { connection?: SSOConnection; error?: { message?: string } } = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to create SSO connection');
        }
        setConnection(data.connection || null);
        setMessage('SSO connection created successfully');
      } else {
        const res = await fetch(`/v1/sso/connections/${teamId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain,
            config,
          }),
        });
        
        const data: { connection?: SSOConnection; error?: { message?: string } } = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to update SSO connection');
        }
        setConnection(data.connection || null);
        setMessage('SSO connection updated successfully');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete SSO connection?')) return;
    
    try {
      const res = await fetch(`/v1/sso/connections/${teamId}`, { method: 'DELETE' });
      if (res.ok) {
        setConnection(null);
        setSelectedProvider('');
        setDomain('');
        setClientId('');
        setClientSecret('');
        setDiscoveryUrl('');
        setSsoUrl('');
        setCertificate('');
        setMessage('SSO connection deleted');
      }
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
  }

  async function handleTest() {
    if (!connection) {
      setError('Please save the connection first');
      return;
    }
    
    setMessage('Redirecting to SSO login...');
    
    try {
      const redirectUri = `${window.location.origin}/v1/sso/callback`;
      const res = await fetch(`/v1/sso/connections/${connection.id}/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUri }),
      });
      
      const data: { authorizationUrl?: string; error?: { message?: string } } = await res.json();
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error(data.error?.message || 'Failed to get authorization URL');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initiate SSO');
    }
  }

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const providerType = currentProvider?.type;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">SSO Settings</h1>
      
      <p className="text-gray-600 mb-6">
        Configure Single Sign-On (SSO) to allow team members to log in with their identity provider.
      </p>
      
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Identity Provider</label>
          <select
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Select a provider...</option>
            {providers
              .filter(p => p.enabled)
              .map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type.toUpperCase()})
                </option>
              ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Email Domain</label>
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Members with @domain emails can use SSO
          </p>
        </div>
        
        {(providerType === 'oidc' || providerType === 'oauth2') && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium">OAuth2/OIDC Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Discovery URL (optional)</label>
              <input
                type="url"
                value={discoveryUrl}
                onChange={e => setDiscoveryUrl(e.target.value)}
                placeholder="https://accounts.google.com/.well-known/openid-configuration"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        )}
        
        {providerType === 'saml' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium">SAML Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">SSO URL</label>
              <input
                type="url"
                value={ssoUrl}
                onChange={e => setSsoUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Certificate (X.509)</label>
              <textarea
                value={certificate}
                onChange={e => setCertificate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                rows={4}
                placeholder="-----BEGIN CERTIFICATE-----"
              />
            </div>
          </div>
        )}
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving || !selectedProvider || !domain}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : connection ? 'Update SSO' : 'Enable SSO'}
          </button>
          
          {connection && (
            <>
              <button
                type="button"
                onClick={handleTest}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Test Login
              </button>
              
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Disable SSO
              </button>
            </>
          )}
        </div>
      </form>
      
      {selectedProvider && (
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-xl font-bold mb-4">Setup Instructions</h2>
          
          <div className="prose max-w-none">
            {selectedProvider.includes('google') && (
              <ol className="list-decimal pl-4 space-y-2">
                <li>Go to <a href="https://console.cloud.google.com" className="text-blue-500" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                <li>Create OAuth 2.0 credentials</li>
                <li>Set authorized redirect URI to: <code className="bg-gray-100 px-2 py-1 rounded">{window.location.origin}/v1/sso/callback</code></li>
                <li>Copy Client ID and Client Secret</li>
                <li>Enter them above</li>
              </ol>
            )}
            
            {selectedProvider.includes('microsoft') && (
              <ol className="list-decimal pl-4 space-y-2">
                <li>Go to <a href="https://portal.azure.com" className="text-blue-500" target="_blank" rel="noopener noreferrer">Azure Portal</a></li>
                <li>Register an application in App Registrations</li>
                <li>Set Redirect URI to: <code className="bg-gray-100 px-2 py-1 rounded">{window.location.origin}/v1/sso/callback</code></li>
                <li>Copy Application (client) ID and Client Secret</li>
              </ol>
            )}
            
            {selectedProvider.includes('okta') && (
              <ol className="list-decimal pl-4 space-y-2">
                <li>Go to your Okta Admin Dashboard</li>
                <li>Create an OIDC App Integration</li>
                <li>Set Sign-in redirect URIs</li>
                <li>Enter your Okta domain as Discovery URL</li>
              </ol>
            )}
            
            {providerType === 'saml' && (
              <ol className="list-decimal pl-4 space-y-2">
                <li>Configure SAML SP metadata on your IdP</li>
                <li>Entity ID: <code className="bg-gray-100 px-2 py-1 rounded">clawroute</code></li>
                <li>ACS URL: <code className="bg-gray-100 px-2 py-1 rounded">{window.location.origin}/v1/sso/callback</code></li>
                <li>Download IdP metadata and enter certificate above</li>
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}