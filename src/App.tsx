import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sun, 
  Moon, 
  RefreshCw
} from "lucide-react";

const START_DATE_STR = "2025-11-10T00:00:00";
const START_DATE = new Date(START_DATE_STR);

interface QuoteType {
  quote: string;
  author: string;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return true;
    }
    return true;
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  const [quote, setQuote] = useState<QuoteType>({
    quote: "Katrs solis, ziņā lai cik mazs, ved tevi tuvāk mērķim.",
    author: "Latviešu gudrība"
  });
  const [loadingQuote, setLoadingQuote] = useState<boolean>(true);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchQuote = async (bypassCache: boolean = false) => {
    setLoadingQuote(true);
    try {
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

  useEffect(() => {
    fetchQuote(false);
  }, []);

  const diffMs = currentTime.getTime() - START_DATE.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  const formatLatvianDate = (date: Date) => {
    return date.toLocaleDateString("lv-LV", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-white text-black dark:bg-black dark:text-white flex flex-col items-center justify-center p-4">
      {/* Dark only background elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden dark:block">
        <div className="absolute top-[-10%] left-[-10%] w-[65%] h-[60%] rounded-full bg-[#4f1a0a] filter blur-[100px] sm:blur-[130px] opacity-40 animate-float-1" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[75%] h-[70%] rounded-full bg-[#1a2c3a] filter blur-[100px] sm:blur-[130px] opacity-30 animate-float-2" />
      </div>

      <main className="w-full max-w-[390px] z-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-[48px] p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between min-h-[660px] bg-white border border-gray-200 shadow-sm dark:bg-white/5 dark:border-white/10 dark:shadow-none"
        >
          {/* Top card Header */}
          <div className="w-full flex justify-between items-center mb-6">
            <span className="text-black/50 dark:text-white/40 text-[10px] sm:text-[11px] tracking-[0.15em] font-bold uppercase select-none">
              OUT OFF BOX {currentTime.getDate()}.{currentTime.getMonth() + 1}.{String(currentTime.getFullYear()).slice(-2)}
            </span>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                id="btn_toggle_theme"
                className="w-10 h-5.5 bg-gray-200 dark:bg-white/10 rounded-full flex items-center px-0.5 border border-gray-300 dark:border-white/5 cursor-pointer relative"
                aria-label="Pārslēgt tumšo režīmu"
              >
                <motion.div 
                  layout
                  transition={{ type: "spring", stiffness: 800, damping: 35 }}
                  className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    darkMode 
                      ? 'bg-amber-500 translate-x-4.5 text-black' 
                      : 'bg-black text-white'
                  }`}
                >
                  {darkMode ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                </motion.div>
              </button>
            </div>
          </div>

          {/* Core dynamic count section */}
          <div className="flex flex-col items-center flex-1 justify-center py-4">
            <div className="text-black/40 dark:text-white/20 text-xs font-semibold uppercase tracking-[0.3em] mb-4 text-center select-none">
              10.11.2025
            </div>

            <div className="relative my-2 select-none">
              <motion.div 
                key={totalDays}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-[120px] sm:text-[140px] font-extralight text-black dark:text-white leading-none tracking-tighter"
              >
                {totalDays}
              </motion.div>
              <div className="absolute -right-4 top-2 text-orange-500 font-bold text-xl select-none">+</div>
            </div>

            <div className="text-black/80 dark:text-white/80 text-lg font-medium tracking-widest mt-1 uppercase select-none">
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

          {/* Cumulative breakdown bar */}
          <div className="w-full text-center py-4 mb-4 border-t border-gray-200 dark:border-white/10 select-none">
            <span className="font-mono text-xs text-black/40 dark:text-white/30 tracking-wide">
              Kopā: <strong className="text-black dark:text-white/80">{totalHours.toLocaleString()}</strong> stundas • <strong className="text-black dark:text-white/80">{totalMinutes.toLocaleString()}</strong> minūtes
            </span>
          </div>

          {/* Quote section */}
          <div className="w-full pb-2 text-center flex flex-col items-center relative gap-1">
            <div className="w-8 h-[1px] bg-orange-500/50 mx-auto mb-6" />

            <div className="w-full min-h-[100px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {loadingQuote ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                    <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                    <span className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/20 uppercase select-none">
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
                    <p className="text-black dark:text-[#e0d8d0] italic text-lg sm:text-xl font-serif leading-relaxed px-4">
                      “{quote.quote}”
                    </p>
                    <p className="mt-3 text-black/50 dark:text-white/30 text-[9px] uppercase tracking-widest leading-none">
                      — {quote.author || "Nezināms"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ delay: 0.8 }}
          className="text-[9px] uppercase tracking-[0.5em] font-bold text-black/50 dark:text-white/30 mt-8 text-center select-none whitespace-nowrap"
        >
          Ritms & Progress • {formatLatvianDate(currentTime)}
        </motion.p>
      </main>
    </div>
  );
}