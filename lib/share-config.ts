import { RoutingRule } from './types';

/**
 * Encode configuration to base64 URL-safe string
 */
export function encodeConfig(rules: RoutingRule[], sceneId: string): string {
  const config = {
    v: 1, // version
    scene: sceneId,
    rules: rules.map(rule => ({
      m: rule.targetModelId,
      c: rule.condition ? [{
        a: rule.condition.attribute,
        v: rule.condition.matchValue,
      }] : null,
    })),
  };
  
  const json = JSON.stringify(config);
  // Use base64url encoding (URL-safe base64)
  const base64 = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return base64;
}

/**
 * Decode base64url string back to configuration
 */
export function decodeConfig(encoded: string): { rules: RoutingRule[]; sceneId: string } | null {
  try {
    // Restore base64 from base64url
    let base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const json = atob(base64);
    const config = JSON.parse(json);
    
    if (config.v !== 1) {
      console.warn('Unknown config version:', config.v);
      return null;
    }
    
    const rules: RoutingRule[] = config.rules.map((r: { m: string; c?: Array<{ a: string; v: string }> }) => {
      const firstCondition = r.c && r.c.length > 0 ? r.c[0] : null;
      return {
        id: Math.random().toString(36).substr(2, 9),
        targetModelId: r.m,
        condition: firstCondition ? {
          attribute: firstCondition.a as 'complexity' | 'hasCode' | 'needsReasoning' | 'inputTokenRange',
          matchValue: firstCondition.v,
        } : null,
        isDefault: !firstCondition,
      };
    });
    
    return {
      rules,
      sceneId: config.scene,
    };
  } catch (error) {
    console.error('Failed to decode config:', error);
    return null;
  }
}

/**
 * Get shareable URL for current configuration
 */
export function getShareUrl(rules: RoutingRule[], sceneId: string): string {
  const encoded = encodeConfig(rules, sceneId);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/#config=${encoded}`;
}

/**
 * Parse configuration from URL hash
 */
export function getConfigFromHash(): { rules: RoutingRule[]; sceneId: string } | null {
  if (typeof window === 'undefined') return null;
  
  const hash = window.location.hash;
  if (!hash.startsWith('#config=')) return null;
  
  const encoded = hash.substring(8); // Remove '#config='
  return decodeConfig(encoded);
}
