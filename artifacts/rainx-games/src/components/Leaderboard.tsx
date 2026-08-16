import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import avatar1 from "@assets/avatar-1.jpg";
import avatar2 from "@assets/avatar-2.jpg";
import avatar3 from "@assets/avatar-3.jpg";
import avatar4 from "@assets/avatar-4.jpg";

const LEADERBOARD_DATA = [
  { id: 1, name: "TradeMaster", avatar: avatar1, score: "214,500", trend: "up", isMe: false },
  { id: 2, name: "KwameX", avatar: avatar2, score: "189,200", trend: "up", isMe: true },
  { id: 3, name: "LunaPlay", avatar: avatar3, score: "145,800", trend: "down", isMe: false },
  { id: 4, name: "Abena_G", avatar: avatar4, score: "112,400", trend: "up", isMe: false },
  { id: 5, name: "GoldRushPro", avatar: avatar1, score: "98,100", trend: "down", isMe: false },
];

export function Leaderboard() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,190,11,0.5)]";
      case 2: return "bg-slate-300 text-slate-800 shadow-[0_0_10px_rgba(203,213,225,0.4)]";
      case 3: return "bg-amber-700 text-amber-50 shadow-[0_0_10px_rgba(180,83,9,0.4)]";
      default: return "bg-card border border-border text-muted-foreground";
    }
  };

  return (
    <section className="px-4 py-8 w-full" ref={ref}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-bold text-xl text-foreground">Live Leaderboard</h2>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      </div>

      <div className="space-y-3 relative">
        {LEADERBOARD_DATA.map((player, index) => {
          const rank = index + 1;
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                player.isMe 
                  ? "bg-primary/5 border-primary/30" 
                  : "bg-card border-border hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getRankStyle(rank)}`}>
                  {rank}
                </div>
                
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border">
                    <img 
                      src={player.avatar} 
                      alt={player.name} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {player.name}
                    {player.isMe && (
                      <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        You
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">Level {25 - rank * 2}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold font-mono text-gold-light">
                  <span className="text-[10px] text-muted-foreground mr-1">GHS</span>
                  {player.score}
                </span>
                {player.trend === "up" ? (
                  <span className="flex items-center text-[10px] text-emerald-400 font-medium">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +2.4%
                  </span>
                ) : (
                  <span className="flex items-center text-[10px] text-red-400 font-medium">
                    <TrendingDown className="w-3 h-3 mr-0.5" /> -1.2%
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.6 }}
        className="w-full mt-5 py-3 flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:text-primary-foreground hover:bg-primary/10 rounded-xl transition-colors"
      >
        View Full Rankings <ChevronRight className="w-4 h-4" />
      </motion.button>
    </section>
  );
}
