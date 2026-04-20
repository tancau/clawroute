'use client';

/**
 * Data Quality Warning Component
 * 
 * Shows warning when model data is incomplete
 */

import { useState } from 'react';
import type { ModelCapability } from '@/lib/models/capability-matrix';
import { checkDataQuality, getContributableFields, FIELD_LABELS } from '@/lib/models/data-quality';

// ===== Types =====

interface DataQualityWarningProps {
  model: ModelCapability;
  onProvideFeedback?: () => void;
  compact?: boolean;
}

// ===== Component =====

export function DataQualityWarning({ 
  model, 
  onProvideFeedback,
  compact = false 
}: DataQualityWarningProps) {
  const [expanded, setExpanded] = useState(!compact);
  
  const quality = checkDataQuality(model);
  const contributableFields = getContributableFields(model);
  
  // Only show if data quality is low
  if (quality.confidence >= 0.7) {
    return null;
  }
  
  const confidencePercent = Math.round(quality.confidence * 100);
  
  if (compact) {
    return (
      <div 
        className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        onClick={() => setExpanded(true)}
      >
        <span className="text-amber-600 dark:text-amber-400 text-sm">
          ⚠️
        </span>
        <span className="text-amber-700 dark:text-amber-300 text-xs font-medium">
          {confidencePercent}% data
        </span>
      </div>
    );
  }
  
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200">
            Data Quality Notice
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            This model has <strong>{confidencePercent}%</strong> data confidence. 
            Help improve accuracy by contributing information.
          </p>
        </div>
        
        {/* Confidence Bar */}
        <div className="flex-shrink-0">
          <div className="w-16 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Expandable Details */}
      {expanded && (
        <div className="mt-4 border-t border-amber-200 dark:border-amber-700 pt-4">
          {/* Missing Fields */}
          {quality.missingFields.length > 0 && (
            <div className="mb-3">
              <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                Missing Information:
              </h5>
              <div className="flex flex-wrap gap-2">
                {contributableFields.map(field => (
                  <span 
                    key={field}
                    className="inline-flex items-center px-2 py-1 bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 text-xs rounded-full"
                  >
                    {FIELD_LABELS[field] || field}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Warnings */}
          {quality.warnings.length > 0 && (
            <div className="mb-4">
              <ul className="space-y-1">
                {quality.warnings.map((warning, i) => (
                  <li 
                    key={i}
                    className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2"
                  >
                    <span>•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Action Button */}
          {onProvideFeedback && (
            <button
              onClick={onProvideFeedback}
              className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              <span>📝</span>
              Contribute Data
            </button>
          )}
        </div>
      )}
      
      {/* Toggle Button */}
      {!compact && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
        >
          {expanded ? '▲ Less' : '▼ More details'}
        </button>
      )}
    </div>
  );
}

// ===== Compact Badge Component =====

export function DataQualityBadge({ model }: { model: ModelCapability }) {
  const quality = checkDataQuality(model);
  
  if (quality.confidence >= 0.8) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
        ✓ Verified
      </span>
    );
  }
  
  if (quality.confidence >= 0.5) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
        {Math.round(quality.confidence * 100)}% data
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
      ⚠️ Needs data
    </span>
  );
}

export default DataQualityWarning;
