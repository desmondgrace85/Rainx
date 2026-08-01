import { TopNav } from "@/components/TopNav";
import { HeroSection } from "@/components/HeroSection";
import { GameTabs } from "@/components/GameTabs";
import { FeaturedGame } from "@/components/FeaturedGame";
import { GameGrid } from "@/components/GameGrid";
import { RainaAI } from "@/components/RainaAI";
import { Leaderboard } from "@/components/Leaderboard";
import { BottomNav } from "@/components/BottomNav";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] flex justify-center w-full font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Mobile-first constraint container */}
      <main className="max-w-[430px] w-full min-h-[100dvh] bg-background relative overflow-x-hidden shadow-2xl sm:border-x border-border/30 flex flex-col pb-20">
        <TopNav />
        <HeroSection />
        <GameTabs />
        <FeaturedGame />
        <GameGrid />
        <RainaAI />
        <Leaderboard />
        <BottomNav />
      </main>
    </div>
  );
}
