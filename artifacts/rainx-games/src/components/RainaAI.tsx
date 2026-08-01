import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { BrainCircuit, Cpu } from "lucide-react";
import rainaAvatarImg from "@assets/raina-ai.jpg";

export function RainaAI() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [activeState, setActiveState] = useState(0);
  
  const states = ["Analyzing market...", "Calculating odds...", "Ready to play"];

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setActiveState((prev) => (prev + 1) % states.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isInView, states.length]);

  return (
    <section className="relative w-full py-12 px-5 mt-6 border-y border-gold/10 overflow-hidden" ref={ref}>
      {/* Background Circuit Pattern (CSS) */}
      <div className="absolute inset-0 z-0 bg-[#0A0A0A] opacity-90" />
      <div 
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] z-0" />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-2xl text-primary text-glow">Meet Raina AI</h2>
          </div>
          <p className="text-sm text-muted-foreground">Your smartest opponent yet</p>
        </motion.div>

        {/* Avatar Area */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.8, type: "spring" }}
          className="relative mb-8"
        >
          {/* Animated pulse rings */}
          <div className="absolute inset-0 rounded-full pulse-ring-anim z-0" />
          <div className="absolute inset-0 rounded-full pulse-ring-anim z-0" style={{ animationDelay: "1s" }} />
          
          <div className="relative z-10 w-32 h-32 rounded-full border-2 border-primary/50 overflow-hidden shadow-[0_0_30px_rgba(201,168,76,0.3)] p-1 bg-background">
            <div className="w-full h-full rounded-full overflow-hidden">
              <img 
                src={rainaAvatarImg} 
                alt="Raina AI" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Dynamic State Chip */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-card border border-primary/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg z-20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-medium text-foreground transition-all">
              {states[activeState]}
            </span>
          </div>
        </motion.div>

        {/* Speech Bubble */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-4 mb-6 relative max-w-[280px]"
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-t border-l border-border rotate-45" />
          <p className="text-center text-sm font-medium italic text-foreground/90">
            "I've studied 2.4M trades. Your move, human."
          </p>
        </motion.div>

        {/* Stats & CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="w-full max-w-[300px] flex flex-col gap-4"
        >
          <div className="bg-background/50 border border-border/50 rounded-xl p-3">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Win Rate
              </span>
              <span className="text-primary">68.4%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={isInView ? { width: "68.4%" } : {}}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                className="h-full bg-primary"
              />
            </div>
          </div>

          <button className="w-full bg-card hover:bg-card/80 text-primary border border-primary/50 font-bold py-3 px-6 rounded-xl shadow-[0_0_15px_rgba(201,168,76,0.15)] hover:shadow-[0_0_25px_rgba(201,168,76,0.3)] transition-all flex justify-center items-center gap-2">
            Challenge Raina
          </button>
        </motion.div>
      </div>
    </section>
  );
}
