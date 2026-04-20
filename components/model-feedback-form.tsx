'use client';

/**
 * Model Feedback Form Component
 * 
 * Allows users to submit feedback on model capabilities
 */

import { useState, useCallback } from 'react';
import type { ModelCapability, ModelCapabilityScores } from '@/lib/models/capability-matrix';
import { FIELD_LABELS } from '@/lib/models/data-quality';

// ===== Types =====

interface FeedbackFormProps {
  model: ModelCapability;
  userId: string;
  onSubmit?: () => void;
  onCancel?: () => void;
}

interface ScoreInput {
  key: keyof ModelCapabilityScores;
  label: string;
  value: number | undefined;
}

// ===== Component =====

export function FeedbackForm({ model, userId, onSubmit, onCancel }: FeedbackFormProps) {
  const [scores, setScores] = useState<Record<string, number>>({
    coding: model.capabilities.coding ?? 5,
    reasoning: model.capabilities.reasoning ?? 5,
    math: model.capabilities.math ?? 5,
    translation: model.capabilities.translation ?? 5,
    creative: model.capabilities.creative ?? 5,
    analysis: model.capabilities.analysis ?? 5,
    longContext: model.capabilities.longContext ?? 5,
    chinese: model.capabilities.chinese ?? 5,
  });
  
  const [costs, setCosts] = useState({
    input: model.cost?.input ?? 0,
    output: model.cost?.output ?? 0,
  });
  
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const scoreInputs: ScoreInput[] = [
    { key: 'coding', label: FIELD_LABELS['coding_score'] || 'Coding', value: scores.coding ?? 5 },
    { key: 'reasoning', label: FIELD_LABELS['reasoning_score'] || 'Reasoning', value: scores.reasoning ?? 5 },
    { key: 'math', label: FIELD_LABELS['math_score'] || 'Math', value: scores.math ?? 5 },
    { key: 'translation', label: FIELD_LABELS['translation_score'] || 'Translation', value: scores.translation ?? 5 },
    { key: 'creative', label: FIELD_LABELS['creative_score'] || 'Creative', value: scores.creative ?? 5 },
    { key: 'analysis', label: FIELD_LABELS['analysis_score'] || 'Analysis', value: scores.analysis ?? 5 },
    { key: 'longContext', label: FIELD_LABELS['long_context_score'] || 'Long Context', value: scores.longContext ?? 5 },
    { key: 'chinese', label: FIELD_LABELS['chinese_score'] || 'Chinese', value: scores.chinese ?? 5 },
  ];
  
  const handleScoreChange = useCallback((key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/models/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.id,
          userId,
          scores,
          costs: costs.input > 0 || costs.output > 0 ? costs : undefined,
          comment: comment || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }
      
      setSuccess(true);
      onSubmit?.();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
          Thank You!
        </h3>
        <p className="text-green-600 dark:text-green-400 text-sm">
          Your feedback helps improve model recommendations for everyone.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Rate Model: {model.name}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {model.id}
        </p>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      {/* Capability Scores */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Capability Scores (1-10)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scoreInputs.map(input => (
            <ScoreSlider
              key={input.key}
              label={input.label}
              value={scores[input.key]}
              onChange={(v) => handleScoreChange(input.key, v)}
            />
          ))}
        </div>
      </div>
      
      {/* Pricing */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Pricing Information ($/1M tokens)
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          If you know the actual pricing, please share it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Input Cost
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={costs.input}
              onChange={(e) => setCosts(prev => ({ ...prev, input: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Output Cost
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={costs.output}
              onChange={(e) => setCosts(prev => ({ ...prev, output: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
      
      {/* Comment */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Additional Comments (Optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Share your experience with this model..."
        />
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? (
            <>
              <span className="animate-spin">⏳</span>
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </div>
    </div>
  );
}

// ===== Score Slider Component =====

interface ScoreSliderProps {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
}

function ScoreSlider({ label, value, onChange }: ScoreSliderProps) {
  const safeValue = value ?? 5;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {safeValue}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        step="0.5"
        value={safeValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}

export default FeedbackForm;
