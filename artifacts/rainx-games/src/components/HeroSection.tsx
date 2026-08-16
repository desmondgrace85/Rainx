import { motion } from "framer-motion";
import { Play } from "lucide-react";
import heroRocketImg from "@assets/hero-rocket.jpg";

export function HeroSection() {
  return (
    <section className="relative w-full h-[400px] flex flex-col justify-end px-5 pb-8 overflow-hidden rounded-b-[2rem]">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-transparent z-10" />
        <img 
          src={heroRocketImg} 
          alt="Gold Rocket Launching" 
          className="w-full h-full object-cover object-center"
        />
        <div className="particles-bg z-10" />
      </div>

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-foreground mb-2 text-glow">
            Play Smart.<br />Win More.
          </h1>
          <p className="text-sm font-medium text-gold-light/80 mb-6 max-w-[280px] mx-auto">
            The premium gaming platform for serious players
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="group relative flex items-center justify-center gap-2 w-full max-w-[240px] bg-gradient-to-r from-gold-muted via-primary to-gold-light text-primary-foreground font-bold py-3.5 px-6 rounded-full shadow-[0_0_20px_rgba(255,190,11,0.3)] hover:shadow-[0_0_30px_rgba(255,190,11,0.5)] transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out rounded-full" />
          <span className="relative z-10 text-sm tracking-wide uppercase">Enter Games</span>
          <Play className="w-4 h-4 relative z-10 fill-current" />
        </motion.button>
      </div>
    </section>
  );
}
