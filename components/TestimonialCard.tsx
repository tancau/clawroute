interface TestimonialCardProps {
  quote: string;
  author: string;
  username: string;
}

export function TestimonialCard({ quote, author, username }: TestimonialCardProps) {
  return (
    <div className="rounded-xl p-6 border border-border bg-card hover:border-primary/30 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">
              {author.charAt(0)}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-foreground text-lg mb-3 leading-relaxed">
            &ldquo;{quote}&rdquo;
          </p>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{author}</span>
            <span className="text-muted-foreground">@{username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
