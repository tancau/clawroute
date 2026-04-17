/**
 * Admin Pricing Page
 * 定价管理页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ModelPricing {
  model: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  enabled: boolean;
}

interface CommissionRate {
  tier: string;
  rate: number;
}

export default function AdminPricingPage() {
  const [models, setModels] = useState<ModelPricing[]>([]);
  const [commissions, setCommissions] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [newInput, setNewInput] = useState('');
  const [newOutput, setNewOutput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pricingRes, commissionRes] = await Promise.all([
        fetch('/v1/admin/pricing/models'),
        fetch('/v1/admin/pricing/commissions'),
      ]);

      if (pricingRes.ok) setModels(await pricingRes.json());
      if (commissionRes.ok) setCommissions(await commissionRes.json());
    } catch (error) {
      console.error('Failed to load pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model: string, inputPrice: number, outputPrice: number) => {
    setEditing(model);
    setNewInput(inputPrice.toString());
    setNewOutput(outputPrice.toString());
  };

  const handleSave = async (model: string) => {
    try {
      const res = await fetch(`/v1/admin/pricing/models/${model}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputPrice: parseFloat(newInput),
          outputPrice: parseFloat(newOutput),
        }),
      });
      if (res.ok) {
        setEditing(null);
        loadData();
      }
    } catch (error) {
      console.error('Failed to update pricing:', error);
    }
  };

  const handleToggle = async (model: string, enabled: boolean) => {
    try {
      const res = await fetch(`/v1/admin/pricing/models/${model}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) loadData();
    } catch (error) {
      console.error('Failed to toggle model:', error);
    }
  };

  const handleUpdateCommission = async (tier: string, rate: number) => {
    try {
      const res = await fetch(`/v1/admin/pricing/commissions/${tier}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate }),
      });
      if (res.ok) loadData();
    } catch (error) {
      console.error('Failed to update commission:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pricing Management</h1>
            <p className="text-[#94a3b8] text-sm">Configure model pricing and commission rates</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-[#94a3b8] hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="p-8">
        {/* Commission Rates */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">💰 Commission Rates</h2>
          <div className="grid grid-cols-3 gap-4">
            {commissions.map((c) => (
              <div key={c.tier} className="bg-[#1e293b] rounded-lg p-4">
                <div className="text-sm text-[#94a3b8] mb-2 capitalize">{c.tier} Tier</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={c.rate}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1 bg-[#0f172a] border border-[#334155] rounded px-3 py-2"
                    onBlur={(e) => {
                      const newRate = parseFloat(e.target.value);
                      if (newRate !== c.rate) {
                        handleUpdateCommission(c.tier, newRate);
                      }
                    }}
                  />
                  <span className="text-[#94a3b8]">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Pricing */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e293b]">
            <h2 className="text-lg font-semibold">📊 Model Pricing</h2>
            <p className="text-sm text-[#94a3b8]">Prices are per 1M tokens</p>
          </div>

          <table className="w-full">
            <thead className="bg-[#1e293b]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Model</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Provider</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Input ($/1M)</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Output ($/1M)</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Status</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.model} className="border-b border-[#1e293b] last:border-0">
                  <td className="px-6 py-4 font-medium">{m.model}</td>
                  <td className="px-6 py-4 text-[#94a3b8]">{m.provider}</td>
                  <td className="px-6 py-4">
                    {editing === m.model ? (
                      <input
                        type="number"
                        value={newInput}
                        onChange={(e) => setNewInput(e.target.value)}
                        className="bg-[#1e293b] border border-[#334155] rounded px-2 py-1 w-24"
                        step="0.01"
                      />
                    ) : (
                      `$${m.inputPrice.toFixed(2)}`
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editing === m.model ? (
                      <input
                        type="number"
                        value={newOutput}
                        onChange={(e) => setNewOutput(e.target.value)}
                        className="bg-[#1e293b] border border-[#334155] rounded px-2 py-1 w-24"
                        step="0.01"
                      />
                    ) : (
                      `$${m.outputPrice.toFixed(2)}`
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        m.enabled
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {m.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {editing === m.model ? (
                        <>
                          <button
                            onClick={() => handleSave(m.model)}
                            className="text-green-400 hover:text-green-300"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="text-[#94a3b8] hover:text-white"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(m.model, m.inputPrice, m.outputPrice)}
                            className="text-[#00c9ff] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggle(m.model, !m.enabled)}
                            className={m.enabled ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}
                          >
                            {m.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
