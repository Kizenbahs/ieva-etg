import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Clock, 
  Quote, 
  Sun, 
  Moon, 
  Sparkles, 
  RefreshCw, 
  Share2, 
  Award, 
  CheckCircle2, 
  ChevronRight,
  Bookmark
} from "lucide-react";

const START_DATE_STR = "2025-11-10T00:00:00";
const START_DATE = new Date(START_DATE_STR);

interface QuoteType {
  quote: string;
  author: string;
}

export default function App() {
  // Dark mode state
  // Always default to dark mode unless user toggles
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      // Default to dark theme
      return true;
    }
    return true;
  });

  // Target current time ticker
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Custom seed for bypassing backend cache to request fresh quotes
  const [quoteSeed, setQuoteSeed] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Quote state
  const [quote, setQuote] = useState<QuoteType>({
    quote: "Katrs solis, ziņā lai cik mazs, ved tevi tuvāk mērķim.",
    author: "Latviešu gudrība"
  });
  const [loadingQuote, setLoadingQuote] = useState<boolean>(true);

  // Sync dark mode class on document element
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch daily quote from our fullstack API
  const fetchQuote = async (bypassCache: boolean = false) => {
    setLoadingQuote(true);
    try {
      // If bypassCache is active, we use current timestamp to generate a fresh unique quote
      const seed = bypassCache ? `refresh_${Date.now()}` : new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/quote?date=${encodeURIComponent(seed)}`);
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      }
    } catch (err) {
      console.error("Kļūda ielādējot citātu:", err);
    } finally {
      setLoadingQuote(false);
    }
  };

  // Fetch initial quote
  useEffect(() => {
    fetchQuote(false);
  }, []);

  // Time calculations
  const diffMs = currentTime.getTime() - START_DATE.getTime();
  
  // Total numbers
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  // Precise modulo time breakdown
  const remainingHours = Math.max(0, Math.floor((diffMs / (1000 * 60 * 60)) % 24));
  const remainingMinutes = Math.max(0, Math.floor((diffMs / (1000 * 60)) % 60));
  const remainingSeconds = Math.max(0, Math.floor((diffMs / 1000) % 60));

  // Dynamic milestone tracker
  // Find next milestone as a multiple of 50 days
  const nextMilestone = (Math.floor(totalDays / 50) + 1) * 50;
  const currentMilestoneBase = Math.floor(totalDays / 50) * 50;
  const milestoneRange = nextMilestone - currentMilestoneBase;
  const milestoneProgress = ((totalDays - currentMilestoneBase) / milestoneRange) * 100;
  const daysToMilestone = nextMilestone - totalDays;

  // Latvian date formatting helper for UI footer/headings
  const formatLatvianDate = (date: Date) => {
    return date.toLocaleDateString("lv-LV", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Date formatted for start date display
  const startDateFormatted = "2025. gada 10. novembris";

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-[#FAF6F0] text-slate-900 transition-colors duration-500 dark:bg-[#050302] dark:text-white flex flex-col items-center justify-center p-4">
      {/* Background spotlights & atmospheric glow */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dark theme glow orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[65%] h-[60%] rounded-full bg-orange-700/10 dark:bg-[#4f1a0a] filter blur-[100px] sm:blur-[130px] opacity-60 dark:opacity-40 animate-float-1" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[75%] h-[70%] rounded-full bg-blue-300/15 dark:bg-[#1a2c3a] filter blur-[100px] sm:blur-[130px] opacity-50 dark:opacity-30 animate-float-2" />
      </div>

      {/* Grid Pattern overlay for premium digital instrumentation texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {/* Primary Centered Glassmorphic Card Container based on Immersive mobile-first specification */}
      <main className="w-full max-w-[390px] z-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="w-full glass rounded-[48px] p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between min-h-[660px]"
        >
          {/* Subtle gradient border shine */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />

          {/* Top card Header control panel */}
          <div className="w-full flex justify-between items-center mb-6">
            <span className="text-slate-500 dark:text-white/40 text-[10px] sm:text-[11px] tracking-[0.15em] font-bold uppercase select-none">
              OUT OFF BOX {currentTime.getDate()}.{currentTime.getMonth() + 1}.{String(currentTime.getFullYear()).slice(-2)}
            </span>
            
            {/* Minimalist Switch Controls block */}
            <div className="flex items-center gap-3">
              {/* Theme Mode luxurious custom switch */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                id="btn_toggle_theme"
                className="w-10 h-5.5 bg-slate-300/50 dark:bg-white/10 rounded-full flex items-center px-0.5 border border-slate-400/10 dark:border-white/5 cursor-pointer relative"
                aria-label="Pārslēgt tumšo režīmu"
              >
                <motion.div 
                  layout
                  transition={{ type: "spring", stiffness: 800, damping: 35 }}
                  className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    darkMode 
                      ? 'bg-amber-500 translate-x-4.5 text-slate-950' 
                      : 'bg-[#050302] text-white'
                  }`}
                >
                  {darkMode ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                </motion.div>
              </button>
            </div>
          </div>

          {/* Core dynamic count section */}
          <div className="flex flex-col items-center flex-1 justify-center py-4">
            <div className="text-slate-500 dark:text-white/20 text-xs font-semibold uppercase tracking-[0.3em] mb-4 text-center select-none">
              10.11.2025
            </div>

            {/* Huge modern dynamic numbers display */}
            <div className="relative my-2 select-none">
              <motion.div 
                key={totalDays}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-[120px] sm:text-[140px] font-extralight text-slate-900 dark:text-white leading-none tracking-tighter text-glow-light dark:text-glow-dark"
              >
                {totalDays}
              </motion.div>
              <div className="absolute -right-4 top-2 text-orange-500 font-bold text-xl select-none">+</div>
            </div>

            <div className="text-slate-800 dark:text-white/80 text-lg font-medium tracking-widest mt-1 uppercase select-none">
              {totalDays === 1 
                ? "Diena" 
                : [2, 3, 4, 5, 6, 7, 8, 9].includes(totalDays % 10) && (totalDays % 100 < 10 || totalDays % 100 >= 20)
                ? "Dienas" 
                : totalDays % 10 === 1 && totalDays % 100 !== 11
                ? "Diena"
                : "Dienas"
              }
            </div>
          </div>

          {/* Persistent fine cumulative inline breakdown bar */}
          <div className="w-full text-center py-4 mb-4 border-t border-slate-200/50 dark:border-white/5 select-none">
            <span className="font-mono text-xs text-slate-500 dark:text-white/30 tracking-wide">
              Kopā: <strong className="text-slate-700 dark:text-white/80">{totalHours.toLocaleString()}</strong> stundas • <strong className="text-slate-700 dark:text-white/80">{totalMinutes.toLocaleString()}</strong> minūtes
            </span>
          </div>



          {/* Beautiful motivational quote in Latvian with fine golden divider line */}
          <div className="w-full pb-2 text-center flex flex-col items-center relative gap-1">
            {/* The signature orange line splitter */}
            <div className="w-8 h-[1px] bg-orange-500/50 mx-auto mb-6" />

            {/* Inspirational Quote container */}
            <div className="w-full min-h-[100px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {loadingQuote ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                    <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-white/20 uppercase select-none">
                      Meklē iedvesmas avotu...
                    </span>
                  </div>
                ) : (
                  <motion.div
                    key={quote.quote}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                  >
                    <p className="text-[#3a3530] dark:text-[#e0d8d0] italic text-lg sm:text-xl font-serif leading-relaxed px-4 opacity-95">
                      “{quote.quote}”
                    </p>
                    <p className="mt-3 text-slate-400 dark:text-white/30 text-[9px] uppercase tracking-widest leading-none">
                      — {quote.author || "Nezināms"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.div>

        {/* Outer subtle footer marking the cosmic rhythm of the app */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ delay: 0.8 }}
          className="text-[9px] uppercase tracking-[0.5em] font-bold text-slate-500 dark:text-white/30 mt-8 text-center select-none whitespace-nowrap"
        >
          Ritms & Progress • {formatLatvianDate(currentTime)}
        </motion.p>
      </main>
    </div>
  );
}
