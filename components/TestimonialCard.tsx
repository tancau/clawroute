interface TestimonialCardProps {
  quote: string;
  author: string;
  username: string;
}

export function TestimonialCard({ quote, author, username }: TestimonialCardProps) {
  return (
    <div className="rounded-xl p-6 border border-[#2a2d3a] bg-[#1a1d29] hover:border-[#00c9ff]/30 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00c9ff] to-[#92fe9d] flex items-center justify-center">
            <span className="text-[#0f172a] font-bold text-lg">
              {author.charAt(0)}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[#f8fafc] text-lg mb-3 leading-relaxed">
            &ldquo;{quote}&rdquo;
          </p>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#f8fafc]">{author}</span>
            <span className="text-[#94a3b8]">@{username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
