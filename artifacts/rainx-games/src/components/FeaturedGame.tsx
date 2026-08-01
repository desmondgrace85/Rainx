import { motion } from "framer-motion";
import moonJetImg from "@assets/moonjet.jpg";

export function FeaturedGame() {
  return (
    <section className="px-4 py-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-bold text-lg text-foreground">Featured</h2>
      </div>
      
      <motion.div 
        whileHover={{ y: -2 }}
        className="relative w-full h-[200px] rounded-2xl overflow-hidden group cursor-pointer border border-border/50 glow-gold-hover transition-all"
      >
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent z-10" />
          <img 
            src={moonJetImg} 
            alt="MoonJet" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-end p-5">
          <h3 className="font-heading font-bold text-3xl text-white mb-1">MoonJet</h3>
          <p className="text-gold-light/90 text-sm font-medium mb-4">Fly high. Aim higher.</p>
          
          <button className="bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-2 px-6 rounded-full w-fit backdrop-blur-md transition-colors shadow-lg">
            Play Now
          </button>
        </div>
      </motion.div>
    </section>
  );
}
