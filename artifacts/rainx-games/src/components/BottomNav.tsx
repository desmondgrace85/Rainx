import { Signal, Gamepad2, Users, PieChart, User } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const TABS = [
  { id: "signals", label: "Signals", icon: Signal },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "community", label: "Community", icon: Users },
  { id: "portfolio", label: "Portfolio", icon: PieChart },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [activeTab, setActiveTab] = useState("games");

  return (
    <nav className="fixed bottom-0 z-50 w-full max-w-[430px] bg-background/90 backdrop-blur-xl border-t border-gold/20 pb-4 pt-2 px-2 flex justify-around items-center">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center justify-center w-16 h-14 transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="bottom-nav-indicator"
                className="absolute top-0 w-8 h-1 bg-primary rounded-full blur-[2px]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            <Icon className={`w-5 h-5 mb-1 ${isActive ? "fill-primary/20" : ""}`} />
            <span className="text-[10px] font-medium">{tab.label}</span>
            
            {isActive && (
              <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
