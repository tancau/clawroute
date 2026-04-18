// No external imports needed - all types defined locally

export interface HealthIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'auth' | 'model-ref' | 'fallback' | 'allowlist' | 'best-practice';
  message: string;
  detail: string;
  fix?: string;
}

export interface HealthReport {
  score: number; // 0-100
  issues: HealthIssue[];
  stats: {
    providers: number;
    models: number;
    primarySet: boolean;
    fallbackCount: number;
    allowlistCount: number;
  };
}

/**
 * Validate a ClawRoute config and produce a health report.
 */
export function diagnoseConfig(config: Record<string, unknown>): HealthReport {
  const issues: HealthIssue[] = [];
  let score = 100;

  // Extract sections
  const models = config.models as Record<string, unknown> | undefined;
  const agents = config.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const modelCfg = defaults?.model as Record<string, unknown> | undefined;
  const allowlist = defaults?.models as Record<string, unknown> | undefined;

  const providers = (models?.providers || {}) as Record<string, Record<string, unknown>>;
  const providerIds = Object.keys(providers);
  const primary = modelCfg?.primary as string | undefined;
  const fallbacks = (modelCfg?.fallbacks || []) as string[];
  const allowlistKeys = allowlist ? Object.keys(allowlist) : [];

  // Count all models across providers
  let totalModels = 0;
  const allModelRefs: string[] = [];
  for (const [pid, pdata] of Object.entries(providers)) {
    const pModels = (pdata.models || []) as Array<Record<string, unknown>>;
    totalModels += pModels.length;
    for (const m of pModels) {
      allModelRefs.push(`${pid}/${m.id}`);
    }
  }

  // ─── Structure checks ───

  if (!models) {
    issues.push({ severity: 'error', category: 'structure', message: 'Missing models section', detail: 'clawroute.json must have a "models" key with providers.', fix: 'Add: "models": { "mode": "merge", "providers": { ... } }' });
    score -= 30;
  }

  if (!agents) {
    issues.push({ severity: 'warning', category: 'structure', message: 'Missing agents section', detail: 'No agents.defaults configured. ClawRoute will use default model selection.', fix: 'Add: "agents": { "defaults": { "model": { "primary": "..." } } }' });
    score -= 15;
  }

  if (models && models.mode !== 'merge' && models.mode !== 'replace') {
    issues.push({ severity: 'info', category: 'structure', message: `models.mode is "${models.mode}"`, detail: '"merge" is recommended for incremental configs. "replace" overwrites built-in providers.', fix: 'Set models.mode to "merge"' });
    score -= 5;
  }

  if (providerIds.length === 0) {
    issues.push({ severity: 'error', category: 'structure', message: 'No providers configured', detail: 'At least one provider must be defined under models.providers.', fix: 'Add a provider with baseUrl, apiKey, and models.' });
    score -= 25;
  }

  // ─── Provider checks ───

  for (const [pid, pdata] of Object.entries(providers)) {
    if (!pdata.baseUrl) {
      issues.push({ severity: 'error', category: 'structure', message: `Provider "${pid}" missing baseUrl`, detail: 'Every provider needs a baseUrl pointing to the API endpoint.', fix: `Add baseUrl to provider "${pid}"` });
      score -= 10;
    }

    if (!pdata.apiKey || (typeof pdata.apiKey === 'string' && pdata.apiKey.trim() === '')) {
      issues.push({ severity: 'warning', category: 'auth', message: `Provider "${pid}" has no API key`, detail: 'ClawRoute will fail to authenticate with this provider.', fix: `Add your API key to provider "${pid}"` });
      score -= 8;
    }

    if (!pdata.api) {
      issues.push({ severity: 'info', category: 'best-practice', message: `Provider "${pid}" missing "api" field`, detail: 'Defaults to "openai-completions". Explicit is better.', fix: `Add "api": "openai-completions" to provider "${pid}"` });
      score -= 2;
    }

    const pModels = (pdata.models || []) as Array<Record<string, unknown>>;
    if (pModels.length === 0) {
      issues.push({ severity: 'warning', category: 'structure', message: `Provider "${pid}" has no models`, detail: 'A provider without models cannot serve any requests.', fix: `Add model entries to provider "${pid}"` });
      score -= 5;
    }

    // Check model entries have required fields
    for (const m of pModels) {
      if (!m.id) {
        issues.push({ severity: 'error', category: 'structure', message: `Model in "${pid}" missing "id"`, detail: 'Every model entry must have an "id" field.', fix: 'Add "id" to the model entry.' });
        score -= 5;
      }
      if (!m.input || !Array.isArray(m.input)) {
        issues.push({ severity: 'info', category: 'best-practice', message: `Model "${m.id || '?'}" in "${pid}" missing "input"`, detail: 'Defaults to ["text"]. Set explicitly for multimodal models.', fix: `Add "input": ["text", "image"] for vision models.` });
        score -= 1;
      }
    }
  }

  // ─── Model ref checks ───

  if (primary) {
    const [prov, ...rest] = primary.split('/');
    const modelId = rest.join('/');

    if (!prov || !modelId) {
      issues.push({ severity: 'error', category: 'model-ref', message: `Invalid primary format: "${primary}"`, detail: 'Must be "provider/model-id" format.', fix: 'Use format like "openai/gpt-4o" or "deepseek/deepseek-v3"' });
      score -= 15;
    } else if (!providers[prov]) {
      issues.push({ severity: 'error', category: 'model-ref', message: `Primary provider "${prov}" not found`, detail: `"${primary}" references provider "${prov}" which doesn't exist in your config.`, fix: `Add provider "${prov}" or fix the primary model ref.` });
      score -= 15;
    } else {
      const pModels = (providers[prov].models || []) as Array<Record<string, unknown>>;
      if (!pModels.some(m => m.id === modelId)) {
        issues.push({ severity: 'error', category: 'model-ref', message: `Primary model "${modelId}" not in provider "${prov}"`, detail: `The model "${primary}" is not defined in provider "${prov}"'s model list.`, fix: `Add model "${modelId}" to provider "${prov}" or fix the reference.` });
        score -= 15;
      }
    }
  } else if (agents) {
    issues.push({ severity: 'warning', category: 'model-ref', message: 'No primary model set', detail: 'agents.defaults.model.primary is not configured. ClawRoute will use its default.', fix: 'Set "primary": "provider/model-id" in agents.defaults.model' });
    score -= 10;
  }

  // ─── Fallback checks ───

  for (let i = 0; i < fallbacks.length; i++) {
    const fb = fallbacks[i]!;
    const [prov, ...rest] = fb.split('/');
    const modelId = rest.join('/');

    if (!prov || !modelId) {
      issues.push({ severity: 'error', category: 'fallback', message: `Invalid fallback format: "${fb}"`, detail: `Fallback #${i + 1} must be "provider/model-id".`, fix: 'Use format like "deepseek/deepseek-v3"' });
      score -= 10;
    } else if (!providers[prov]) {
      issues.push({ severity: 'error', category: 'fallback', message: `Fallback provider "${prov}" not found`, detail: `Fallback "${fb}" references missing provider "${prov}".`, fix: `Add provider "${prov}" or remove this fallback.` });
      score -= 10;
    } else {
      const pModels = (providers[prov].models || []) as Array<Record<string, unknown>>;
      if (!pModels.some(m => m.id === modelId)) {
        issues.push({ severity: 'error', category: 'fallback', message: `Fallback model "${modelId}" not in provider "${prov}"`, detail: `"${fb}" is not in provider "${prov}"'s model list.`, fix: `Add model or fix the reference.` });
        score -= 10;
      }
    }
  }

  if (primary && fallbacks.length === 0) {
    issues.push({ severity: 'info', category: 'best-practice', message: 'No fallback models configured', detail: 'If your primary goes down, ClawRoute has no backup. Adding fallbacks improves reliability.', fix: 'Add 1-3 fallback models for resilience.' });
    score -= 3;
  }

  // Check for duplicate fallback
  const fbSet = new Set(fallbacks);
  if (fbSet.size < fallbacks.length) {
    issues.push({ severity: 'warning', category: 'fallback', message: 'Duplicate fallback entries', detail: 'Some models appear multiple times in your fallback list.', fix: 'Remove duplicate entries.' });
    score -= 5;
  }

  // ─── Allowlist checks ───

  if (primary && allowlistKeys.length > 0 && !allowlistKeys.includes(primary)) {
    issues.push({ severity: 'error', category: 'allowlist', message: `Primary "${primary}" not in allowlist`, detail: 'When agents.defaults.models is set, it becomes the allowlist. Your primary model must be included or it will be blocked.', fix: `Add "${primary}" to agents.defaults.models` });
    score -= 15;
  }

  for (const fb of fallbacks) {
    if (allowlistKeys.length > 0 && !allowlistKeys.includes(fb)) {
      issues.push({ severity: 'warning', category: 'allowlist', message: `Fallback "${fb}" not in allowlist`, detail: 'This fallback will be blocked by the allowlist filter.', fix: `Add "${fb}" to agents.defaults.models` });
      score -= 8;
    }
  }

  // ─── Best practice checks ───

  // Single provider risk
  if (providerIds.length === 1) {
    issues.push({ severity: 'info', category: 'best-practice', message: 'Only one provider configured', detail: 'If this provider goes down, everything stops. Consider adding a backup provider.', fix: 'Add a second provider (e.g. OpenRouter) as fallback.' });
    score -= 3;
  }

  // Free models in primary
  if (primary && primary.includes(':free')) {
    issues.push({ severity: 'info', category: 'best-practice', message: 'Primary is a free-tier model', detail: 'Free models often have rate limits and may be less reliable. Good for dev, risky for production.', fix: 'Consider a paid model as primary with free as fallback.' });
    score -= 2;
  }

  // Ensure score is in range
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    issues,
    stats: {
      providers: providerIds.length,
      models: totalModels,
      primarySet: !!primary,
      fallbackCount: fallbacks.length,
      allowlistCount: allowlistKeys.length,
    },
  };
}
