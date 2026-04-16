import type { ModelSelection } from './types';

/**
 * Encode model selection to base64 URL-safe string
 */
export function encodeConfig(selection: ModelSelection, sceneId: string): string {
  const config = {
    v: 2, // version 2 = primary+fallbacks
    scene: sceneId,
    primary: selection.primaryModelId,
    fallbacks: selection.fallbackModelIds,
  };
  
  const json = JSON.stringify(config);
  const base64 = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return base64;
}

/**
 * Decode base64url string back to configuration
 */
export function decodeConfig(encoded: string): { selection: ModelSelection; sceneId: string } | null {
  try {
    let base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const json = atob(base64);
    const config = JSON.parse(json);
    
    if (config.v === 2) {
      return {
        selection: {
          primaryModelId: config.primary,
          fallbackModelIds: config.fallbacks || [],
        },
        sceneId: config.scene,
      };
    }
    
    // Legacy v1 format (routing rules) - not supported anymore
    console.warn('Legacy config v1 not supported');
    return null;
  } catch (error) {
    console.error('Failed to decode config:', error);
    return null;
  }
}

/**
 * Get shareable URL for current configuration
 */
export function getShareUrl(selection: ModelSelection, sceneId: string): string {
  const encoded = encodeConfig(selection, sceneId);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/#config=${encoded}`;
}

/**
 * Parse configuration from URL hash
 */
export function getConfigFromHash(): { selection: ModelSelection; sceneId: string } | null {
  if (typeof window === 'undefined') return null;
  
  const hash = window.location.hash;
  if (!hash.startsWith('#config=')) return null;
  
  const encoded = hash.substring(8);
  return decodeConfig(encoded);
}
