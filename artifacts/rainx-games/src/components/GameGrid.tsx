import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import moonJetImg from "@assets/moonjet.jpg";
import traderDuelImg from "@assets/trader-duel.jpg";
import bullBearImg from "@assets/bull-bear.jpg";
import goldenVaultImg from "@assets/golden-vault.jpg";
import rainaAiImg from "@assets/raina-ai.jpg";

const GAMES = [
  { id: 1, title: "MoonJet", subtitle: "Fly high. Aim higher.", img: moonJetImg, colSpan: false },
  { id: 2, title: "Trader Duel", subtitle: "Battle traders in real-time", img: traderDuelImg, colSpan: false },
  { id: 3, title: "Bull vs Bear", subtitle: "Who controls the market?", img: bullBearImg, colSpan: false },
  { id: 4, title: "Golden Vault", subtitle: "The richest vault in crypto", img: goldenVaultImg, colSpan: false },
  { id: 5, title: "Raina AI Challenge", subtitle: "Can you outsmart the AI?", img: rainaAiImg, colSpan: true },
];

export function GameGrid() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section className="px-4 py-4 w-full" ref={ref}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-lg text-foreground">Trending Games</h2>
        <button className="text-xs text-muted-foreground hover:text-primary transition-colors">View all</button>
      </div>

      <motion.div 
        className="grid grid-cols-2 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {GAMES.map((game) => (
          <motion.div
            key={game.id}
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className={`relative rounded-xl overflow-hidden group cursor-pointer border border-border bg-card aspect-[4/5] glow-gold-hover transition-all ${
              game.colSpan ? "col-span-2 aspect-[2.5/1]" : ""
            }`}
          >
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
              <img 
                src={game.img} 
                alt={game.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                loading="lazy"
              />
            </div>
            
            <div className="relative z-20 h-full flex flex-col justify-end p-3">
              <h3 className="font-heading font-bold text-sm text-white">{game.title}</h3>
              <p className="text-[10px] text-gold-light/70 line-clamp-1">{game.subtitle}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
