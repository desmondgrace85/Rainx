import { useState } from "react";
import { motion } from "framer-motion";

const CATEGORIES = ["All Games", "Trending", "Strategy", "Duel", "Quick Play"];

export function GameTabs() {
  const [activeTab, setActiveTab] = useState("All Games");

  return (
    <div className="w-full px-4 pt-6 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2">
        {CATEGORIES.map((category) => {
          const isActive = activeTab === category;
          return (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`relative whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive ? "text-primary-foreground" : "text-muted-foreground bg-card border border-border hover:text-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-category-pill"
                  className="absolute inset-0 bg-primary rounded-full glow-gold"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
