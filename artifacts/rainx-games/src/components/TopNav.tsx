import { Flame, Plus } from "lucide-react";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-gold/20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Flame className="w-5 h-5 text-primary fill-primary" />
        <span className="font-heading font-bold text-lg tracking-tight text-foreground">RainX</span>
      </div>
      
      <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 shadow-sm glow-gold">
        <span className="text-xs font-semibold text-foreground">GHS 4,320.00</span>
        <button className="bg-primary/20 text-primary hover:bg-primary/30 rounded-full p-0.5 transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
