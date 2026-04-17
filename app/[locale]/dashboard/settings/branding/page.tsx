'use client';

import { useState, useEffect } from 'react';

interface BrandConfig {
  teamId: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  customCss?: string;
  emailTemplates?: Record<string, string>;
  features?: {
    hideClawRouterBranding: boolean;
    customFooter: string;
  };
}

interface CustomDomain {
  domain: string;
  teamId: string;
  verificationToken: string;
  verified: boolean;
  sslEnabled: boolean;
}

export default function BrandingPage() {
  const [teamId, setTeamId] = useState('');
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#00c9ff');
  const [secondaryColor, setSecondaryColor] = useState('#92fe9d');
  const [customDomain, setCustomDomain] = useState('');
  const [hideBranding, setHideBranding] = useState(false);
  const [customFooter, setCustomFooter] = useState('');

  useEffect(() => {
    const storedTeamId = localStorage.getItem('currentTeamId') || 'team-default';
    setTeamId(storedTeamId);
    loadBrandConfig(storedTeamId);
    loadDomains(storedTeamId);
  }, []);

  async function loadBrandConfig(tid: string) {
    try {
      const res = await fetch(`/v1/teams/${tid}/branding`);
      const data: { config?: BrandConfig } = await res.json();
      if (data.config) {
        setLogoUrl(data.config.logoUrl || '');
        setPrimaryColor(data.config.primaryColor || '#00c9ff');
        setSecondaryColor(data.config.secondaryColor || '#92fe9d');
        setCustomDomain(data.config.customDomain || '');
        setHideBranding(data.config.features?.hideClawRouterBranding || false);
        setCustomFooter(data.config.features?.customFooter || '');
      }
    } catch (err) {
      console.error('Failed to load brand config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDomains(tid: string) {
    try {
      const res = await fetch(`/v1/teams/${tid}/branding/domains`);
      const data: { domains?: CustomDomain[] } = await res.json();
      if (data.domains) {
        setDomains(data.domains);
      }
    } catch (err) {
      console.error('Failed to load domains:', err);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/v1/teams/${teamId}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl,
          primaryColor,
          secondaryColor,
          customDomain,
          features: {
            hideClawRouterBranding: hideBranding,
            customFooter,
          },
        }),
      });
      
      const data: { config?: BrandConfig; error?: { message?: string } } = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to save');
      }
      
      setMessage('Branding saved successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterDomain() {
    if (!customDomain) {
      setError('Please enter a domain');
      return;
    }
    
    try {
      const validateRes = await fetch('/v1/branding/domains/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: customDomain }),
      });
      const validateData: { valid?: boolean; error?: string } = await validateRes.json();
      if (!validateData.valid) {
        setError(validateData.error || 'Invalid domain');
        return;
      }
      
      const regRes = await fetch(`/v1/teams/${teamId}/branding/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: customDomain }),
      });
      const regData: { domain?: CustomDomain; error?: { message?: string } } = await regRes.json();
      
      if (!regRes.ok) {
        throw new Error(regData.error?.message || 'Failed to register domain');
      }
      
      if (regData.domain) {
        setDomains([...domains, regData.domain]);
      }
      setMessage('Domain registered. Please add DNS TXT record to verify.');
      setCustomDomain('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register domain');
    }
  }

  async function handleVerifyDomain(domain: string, token: string) {
    try {
      const res = await fetch(`/v1/branding/domains/${domain}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data: { verified?: boolean } = await res.json();
      
      if (data.verified) {
        setDomains(domains.map(d => d.domain === domain ? { ...d, verified: true } : d));
        setMessage('Domain verified successfully');
      } else {
        setError('Verification failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  async function handleDeleteDomain(domain: string) {
    if (!confirm('Delete this domain?')) return;
    
    try {
      const res = await fetch(`/v1/branding/domains/${domain}`, { method: 'DELETE' });
      if (res.ok) {
        setDomains(domains.filter(d => d.domain !== domain));
      }
    } catch (err) {
      console.error('Failed to delete domain:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Branding Settings</h1>
      
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
          <label className="block text-sm font-medium mb-2">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-3 py-2 border rounded-lg"
          />
          {logoUrl && (
            <div className="mt-2 p-4 bg-gray-50 rounded-lg inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo preview" className="max-h-16" />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-12 h-10 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="w-12 h-10 cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Preview</label>
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: secondaryColor }}
          >
            <div
              className="p-2 rounded"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="text-white font-bold">Brand Preview</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideBranding"
              checked={hideBranding}
              onChange={e => setHideBranding(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="hideBranding" className="text-sm">
              Hide ClawRouter branding
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Custom Footer</label>
            <textarea
              value={customFooter}
              onChange={e => setCustomFooter(e.target.value)}
              placeholder="© 2024 Your Company"
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
      
      <div className="mt-8 pt-8 border-t">
        <h2 className="text-xl font-bold mb-4">Custom Domains</h2>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customDomain}
            onChange={e => setCustomDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={handleRegisterDomain}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Add Domain
          </button>
        </div>
        
        {domains.length > 0 && (
          <div className="space-y-2">
            {domains.map(domain => (
              <div
                key={domain.domain}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium">{domain.domain}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {domain.verified ? '✅ Verified' : '⏳ Pending'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!domain.verified && (
                    <button
                      onClick={() => handleVerifyDomain(domain.domain, domain.verificationToken)}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Verify
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteDomain(domain.domain)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}