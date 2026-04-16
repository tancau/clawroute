'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function ConfigImporter() {
  const t = useTranslations('importer');
  const [yaml, setYaml] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    issues: string[];
    suggestions: string[];
  } | null>(null);
  
  const analyze = async () => {
    if (!yaml.trim()) return;
    
    setAnalyzing(true);
    setResult(null);
    
    // Simple rule-based analysis (in production, this could call an AI)
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for missing provider configs
    if (!yaml.includes('baseUrl') && yaml.includes('provider:')) {
      issues.push(t('issues.missingBaseUrl'));
      suggestions.push(t('suggestions.addBaseUrl'));
    }
    
    // Check for expensive models without conditions
    if (yaml.includes('gpt-4') && !yaml.includes('condition:')) {
      issues.push(t('issues.gpt4NoCondition'));
      suggestions.push(t('suggestions.routeGpt4'));
    }
    
    // Check for missing free tier
    if (!yaml.includes('free') && !yaml.includes('cost: 0')) {
      issues.push(t('issues.noFreeTier'));
      suggestions.push(t('suggestions.addFreeTier'));
    }
    
    // Check for default rule
    if (!yaml.includes('default:') && !yaml.includes('- model:')) {
      issues.push(t('issues.noDefault'));
      suggestions.push(t('suggestions.addDefault'));
    }
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setResult({ issues, suggestions });
    setAnalyzing(false);
  };
  
  return (
    <div className="bg-[#1a1d29] rounded-2xl p-6 border border-[#2a2d3a]">
      <h3 className="text-xl font-bold text-[#f8fafc] mb-4">{t('title')}</h3>
      <p className="text-[#94a3b8] mb-6">{t('description')}</p>
      
      <div className="mb-4">
        <textarea
          value={yaml}
          onChange={(e) => setYaml(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full h-40 px-4 py-3 bg-[#0a0a0a] border border-[#2a2d3a] rounded-xl text-[#f8fafc] font-mono text-sm focus:border-[#00c9ff] focus:outline-none resize-none"
        />
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={analyze}
          disabled={!yaml.trim() || analyzing}
          className="px-6 py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? t('analyzing') : t('analyze')}
        </button>
        
        {yaml && (
          <button
            onClick={() => {
              setYaml('');
              setResult(null);
            }}
            className="px-6 py-3 border border-[#2a2d3a] text-[#94a3b8] font-semibold rounded-xl hover:border-[#00c9ff]/50 transition-colors"
          >
            {t('clear')}
          </button>
        )}
      </div>
      
      {result && (
        <div className="mt-6 space-y-4">
          {result.issues.length > 0 ? (
            <>
              <div className="bg-[#0a0a0a] rounded-xl p-4">
                <h4 className="font-semibold text-[#ff6b6b] mb-3 flex items-center gap-2">
                  <span>⚠️</span> {t('foundIssues')}
                </h4>
                <ul className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="text-[#94a3b8] text-sm flex items-start gap-2">
                      <span className="text-[#ff6b6b]">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-[#0a0a0a] rounded-xl p-4">
                <h4 className="font-semibold text-[#92fe9d] mb-3 flex items-center gap-2">
                  <span>💡</span> {t('suggestions')}
                </h4>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-[#94a3b8] text-sm flex items-start gap-2">
                      <span className="text-[#92fe9d]">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
              
              <a
                href="#scenes"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                {t('generateOptimized')}
              </a>
            </>
          ) : (
            <div className="bg-[#0a0a0a] rounded-xl p-4 text-center">
              <p className="text-[#92fe9d] flex items-center justify-center gap-2">
                <span>✅</span> {t('noIssues')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
