import type { Scene } from '@/lib/types';

interface SceneCardProps {
  scene: Scene;
  onSelect: (sceneId: string) => void;
}

export function SceneCard({ scene, onSelect }: SceneCardProps) {
  return (
    <div
      className="relative rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
      onClick={() => onSelect(scene.id)}
    >
      <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-[#00c9ff] via-[#92fe9d] to-[#6366f1] opacity-50 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-[#1a1d29] rounded-xl p-6 text-center h-full">
        <span className="text-5xl mb-4 block">{scene.icon}</span>
        <h3 className="text-xl font-semibold mb-2 text-[#f8fafc]">{scene.name}</h3>
        <p className="text-sm text-[#94a3b8] mb-3">{scene.description}</p>
        <span className="inline-block text-xs font-medium bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] bg-clip-text text-transparent">
          节省 {scene.estimatedSaving}
        </span>
      </div>
    </div>
  );
}
