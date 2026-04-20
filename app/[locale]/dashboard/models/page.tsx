'use client';

/**
 * Model Rankings Dashboard
 * 
 * Displays two separate rankings:
 * 1. Objective Ranking - Based on benchmarks (70%) + Arena Elo (30%)
 * 2. User Choice Ranking - Based on user preferences and reviews
 */

import { useState, useEffect } from 'react';
import type { ModelCapability } from '@/lib/models/capability-matrix';
import { DataQualityBadge } from '@/components/data-quality-warning';
import { FeedbackForm } from '@/components/model-feedback-form';

// ===== Types =====

interface ModelWithFeedback extends ModelCapability {
  userFeedbackStats?: {
    totalFeedbacks: number;
    verifiedFeedbacks: number;
    avgScores: Record<string, number>;
  };
  mergedScores?: {
    overallScore: number;
    valueScore: number;
    confidence: number;
    sources: string[];
  };
}

interface ModelsResponse {
  models: ModelWithFeedback[];
  lastUpdated: string;
  totalModels: number;
  modelsWithFeedback: number;
}

// ===== Component =====

export default function ModelRankingsPage() {
  const [models, setModels] = useState<ModelWithFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelWithFeedback | null>(null);
  const [activeTab, setActiveTab] = useState<'objective' | 'user-choice' | 'user-reviews'>('objective');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock user ID (in real app, get from auth)
  const userId = 'demo-user-001';
  
  useEffect(() => {
    loadModels();
  }, []);
  
  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/models/capabilities?merged=true');
      
      if (!response.ok) {
        throw new Error('Failed to load models');
      }
      
      const data: ModelsResponse = await response.json();
      setModels(data.models);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };
  
  // Get objective ranking (sorted by overall score)
  const objectiveRanking = [...models]
    .sort((a, b) => {
      const scoreA = a.mergedScores?.overallScore ?? a.overallScore ?? 0;
      const scoreB = b.mergedScores?.overallScore ?? b.overallScore ?? 0;
      return scoreB - scoreA;
    })
    .filter(model => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return model.name.toLowerCase().includes(query) ||
               model.id.toLowerCase().includes(query);
      }
      return true;
    });
  
  // Get user choice ranking (sorted by feedback count)
  const userChoiceRanking = [...models]
    .filter(m => m.userFeedbackStats && m.userFeedbackStats.totalFeedbacks > 0)
    .sort((a, b) => {
      const countA = a.userFeedbackStats?.totalFeedbacks ?? 0;
      const countB = b.userFeedbackStats?.totalFeedbacks ?? 0;
      return countB - countA;
    });
  
  // Get user reviews ranking (sorted by average user score)
  const userReviewsRanking = [...models]
    .filter(m => m.userFeedbackStats && m.userFeedbackStats.totalFeedbacks > 0)
    .map(m => {
      const avgScores = Object.values(m.userFeedbackStats?.avgScores ?? {});
      const avgUserScore = avgScores.length > 0
        ? avgScores.reduce((a, b) => a + b, 0) / avgScores.length
        : 0;
      return { ...m, avgUserScore };
    })
    .sort((a, b) => b.avgUserScore - a.avgUserScore);
  
  const handleFeedbackSubmit = () => {
    loadModels();
    setSelectedModel(null);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Loading models...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadModels}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Model Rankings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Objective scores vs. User preferences
          </p>
          
          {/* Info Banner */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Score Sources:</strong> Benchmarks (70%) + Arena Elo (30%)
                <br />
                <strong>User Reviews:</strong> For reference only, not used in scoring
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('objective')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'objective'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📊 Objective Ranking
          </button>
          <button
            onClick={() => setActiveTab('user-choice')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'user-choice'
                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            ⭐ User Choice
          </button>
          <button
            onClick={() => setActiveTab('user-reviews')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'user-reviews'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            💬 User Reviews
          </button>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {models.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Models
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {models.filter(m => (m.mergedScores?.overallScore ?? m.overallScore ?? 0) >= 8).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              High Quality (≥8)
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {userChoiceRanking.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              With User Feedback
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {models.reduce((sum, m) => sum + (m.userFeedbackStats?.totalFeedbacks ?? 0), 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Reviews
            </div>
          </div>
        </div>
        
        {/* Content */}
        {activeTab === 'objective' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📊 Objective Ranking (Benchmarks 70% + Arena 30%)
            </h2>
            {objectiveRanking.map((model, index) => (
              <ObjectiveRankingCard
                key={model.id}
                model={model}
                rank={index + 1}
                onProvideFeedback={() => setSelectedModel(model)}
              />
            ))}
          </div>
        )}
        
        {activeTab === 'user-choice' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ⭐ Most Chosen by Users
            </h2>
            {userChoiceRanking.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No user feedback yet. Be the first to review!
                </p>
              </div>
            ) : (
              userChoiceRanking.map((model, index) => (
                <UserChoiceCard
                  key={model.id}
                  model={model}
                  rank={index + 1}
                  onProvideFeedback={() => setSelectedModel(model)}
                />
              ))
            )}
          </div>
        )}
        
        {activeTab === 'user-reviews' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              💬 Highest User Ratings
            </h2>
            {userReviewsRanking.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No user reviews yet. Be the first to review!
                </p>
              </div>
            ) : (
              userReviewsRanking.map((model, index) => (
                <UserReviewCard
                  key={model.id}
                  model={model}
                  avgUserScore={(model as ModelWithFeedback & { avgUserScore: number }).avgUserScore}
                  rank={index + 1}
                  onProvideFeedback={() => setSelectedModel(model)}
                />
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Feedback Modal */}
      {selectedModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <FeedbackForm
              model={selectedModel}
              userId={userId}
              onSubmit={handleFeedbackSubmit}
              onCancel={() => setSelectedModel(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Objective Ranking Card =====

interface CardProps {
  model: ModelWithFeedback;
  rank: number;
  onProvideFeedback: () => void;
}

function ObjectiveRankingCard({ model, rank, onProvideFeedback }: CardProps) {
  const score = model.mergedScores?.overallScore ?? model.overallScore ?? 0;
  const valueScore = model.mergedScores?.valueScore ?? model.valueScore ?? 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg ${
          rank <= 3 
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {rank}
        </div>
        
        {/* Model Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {model.name}
            </h3>
            <DataQualityBadge model={model} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {model.provider} • {model.id}
          </p>
        </div>
        
        {/* Scores */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {score.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Quality
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {valueScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Value
            </div>
          </div>
        </div>
        
        {/* Feedback Button */}
        <button
          onClick={onProvideFeedback}
          className="px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          Review
        </button>
      </div>
      
      {/* Capability Scores */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(model.capabilities).map(([key, value]) => (
            <span key={key} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              {key}: {value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== User Choice Card =====

function UserChoiceCard({ model, rank, onProvideFeedback }: CardProps) {
  const feedbackCount = model.userFeedbackStats?.totalFeedbacks ?? 0;
  const verifiedCount = model.userFeedbackStats?.verifiedFeedbacks ?? 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-lg">
          {rank}
        </div>
        
        {/* Model Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {model.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {model.provider}
          </p>
        </div>
        
        {/* Feedback Count */}
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {feedbackCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Reviews
          </div>
          {verifiedCount > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400">
              ✓ {verifiedCount} verified
            </div>
          )}
        </div>
        
        {/* Feedback Button */}
        <button
          onClick={onProvideFeedback}
          className="px-3 py-1.5 text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50"
        >
          Add Review
        </button>
      </div>
      
      {/* User Scores */}
      {model.userFeedbackStats?.avgScores && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            User Ratings:
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(model.userFeedbackStats.avgScores).map(([key, value]) => (
              <span key={key} className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded">
                {key}: {value.toFixed(1)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== User Review Card =====

function UserReviewCard({ model, avgUserScore, rank, onProvideFeedback }: CardProps & { avgUserScore: number }) {
  const feedbackCount = model.userFeedbackStats?.totalFeedbacks ?? 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-lg">
          {rank}
        </div>
        
        {/* Model Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {model.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {model.provider} • {feedbackCount} reviews
          </p>
        </div>
        
        {/* Average User Score */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {avgUserScore.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Avg User Rating
          </div>
          <div className="flex justify-center mt-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < Math.round(avgUserScore / 2) ? 'text-yellow-400' : 'text-gray-300'}>
                ★
              </span>
            ))}
          </div>
        </div>
        
        {/* Feedback Button */}
        <button
          onClick={onProvideFeedback}
          className="px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50"
        >
          Rate
        </button>
      </div>
    </div>
  );
}
