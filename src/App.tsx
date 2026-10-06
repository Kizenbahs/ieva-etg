import React, { useState, useEffect, ReactNode, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sun, 
  Moon, 
  RefreshCw, 
  Heart, 
  BookOpen, 
  Calendar, 
  Clock, 
  X, 
  Sparkles, 
  ArrowUpRight
} from "lucide-react";

interface PinLockScreenProps {
  onUnlock: (token: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock, darkMode, setDarkMode }) => {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const checkPin = async (candidate: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: candidate })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          onUnlock(data.token);
          return;
        }
      }

      const errData = await res.json().catch(() => ({}));
      setErrorMsg(errData.error || "Nepareizs PIN kods. Mēģiniet vēlreiz.");
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin("");
      }, 500);
    } catch {
      setErrorMsg("Savienojuma kļūda. Mēģiniet vēlreiz.");
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin("");
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (loading) return;
    if (pin.length < 4) {
      setErrorMsg("");
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        checkPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setErrorMsg("");
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setErrorMsg("");
    setPin("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, loading]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F4F0E6] text-stone-900 dark:bg-[#0E120F] dark:text-stone-100 p-4 transition-colors duration-500 relative overflow-hidden select-none">
      {/* Ambient glow in dark mode */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden dark:block">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#1c3a1b] filter blur-[120px] opacity-40" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#0e2c1e] filter blur-[120px] opacity-35" />
      </div>

      {/* Theme Toggle Top Right */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-4 right-4 p-2.5 rounded-2xl bg-stone-200/60 hover:bg-stone-200/90 dark:bg-[#141A16] dark:hover:bg-[#1c241f] border border-[#DCD5C5]/60 dark:border-[#233227] text-stone-600 dark:text-stone-300 transition-all cursor-pointer z-10"
        aria-label="Pārslēgt tumšo režīmu"
      >
        {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-stone-600" />}
      </button>

      {/* Lock Box with Running Tail Border */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-[290px] sm:max-w-sm relative p-[2px] rounded-3xl overflow-hidden shadow-2xl z-10 bg-[#E2DDD0] dark:bg-[#233227] ${
          shake ? "animate-bounce" : ""
        }`}
      >
        {/* Animated Running Tail Border */}
        <div className="absolute inset-[-150%] animate-border-spin bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_250deg,rgba(70,124,50,0.2)_280deg,#467C32_320deg,#88D462_350deg,#dcfce7_360deg)] dark:bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_240deg,rgba(136,212,98,0.25)_275deg,#467C32_315deg,#88D462_350deg,#ffffff_360deg)] pointer-events-none" />

        {/* Inner Card Container */}
        <div className="relative w-full h-full rounded-[calc(1.5rem-2px)] p-5 sm:p-7 bg-[#FAF7F0] dark:bg-[#141A16] flex flex-col items-center text-center">
          {/* PIN Bubble Indicators */}
          <div className="flex items-center justify-center gap-3.5 sm:gap-4 mb-3 sm:mb-4">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <motion.div
                  key={index}
                  animate={{
                    scale: isFilled ? 1.15 : 1,
                    backgroundColor: isFilled
                      ? errorMsg
                        ? "#EF4444"
                        : "#467C32"
                      : "transparent",
                  }}
                  transition={{ duration: 0.15 }}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 transition-colors duration-200 ${
                    errorMsg
                      ? "border-red-500"
                      : isFilled
                      ? "border-[#467C32] dark:border-[#88D462] dark:bg-[#88D462]"
                      : "border-stone-400 dark:border-stone-600"
                  }`}
                />
              );
            })}
          </div>

          {/* Error message */}
          <div className="h-5 mb-2 sm:mb-3 flex items-center justify-center">
            {errorMsg && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium text-red-500"
              >
                {errorMsg}
              </motion.span>
            )}
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[240px] sm:max-w-[260px]">
            {[
              { num: "1", sub: "ETG" },
              { num: "2", sub: "ABC" },
              { num: "3", sub: "DEF" },
              { num: "4", sub: "GHI" },
              { num: "5", sub: "JKL" },
              { num: "6", sub: "MNO" },
              { num: "7", sub: "PQRS" },
              { num: "8", sub: "TUV" },
              { num: "9", sub: "WXYZ" },
            ].map(({ num, sub }) => (
              <button
                key={num}
                onClick={() => handleDigit(num)}
                className="w-full aspect-square rounded-2xl bg-stone-200/50 hover:bg-stone-200 dark:bg-stone-800/40 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 transition-all duration-150 active:scale-95 flex flex-col items-center justify-center cursor-pointer border border-[#DCD5C5]/40 dark:border-[#233227]"
              >
                <span className="text-base sm:text-lg font-mono font-semibold leading-none">{num}</span>
                {sub ? (
                  <span className="text-[8px] sm:text-[9px] font-sans font-semibold tracking-wider text-stone-500 dark:text-stone-400 mt-0.5 leading-none">
                    {sub}
                  </span>
                ) : (
                  <span className="h-[8px] sm:h-[9px] mt-0.5" />
                )}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="w-full aspect-square rounded-2xl bg-stone-200/50 hover:bg-stone-200 dark:bg-stone-800/40 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 transition-all duration-150 active:scale-95 flex flex-col items-center justify-center cursor-pointer border border-[#DCD5C5]/40 dark:border-[#233227]"
            >
              <span className="text-base sm:text-lg font-mono font-semibold leading-none">C</span>
              <span className="text-[7px] sm:text-[8px] font-sans font-semibold tracking-tight text-stone-500 dark:text-stone-400 mt-0.5 leading-none whitespace-nowrap">
                DZĒST VISU
              </span>
            </button>
            <button
              onClick={() => handleDigit("0")}
              className="w-full aspect-square rounded-2xl bg-stone-200/50 hover:bg-stone-200 dark:bg-stone-800/40 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 transition-all duration-150 active:scale-95 flex flex-col items-center justify-center cursor-pointer border border-[#DCD5C5]/40 dark:border-[#233227]"
            >
              <span className="text-base sm:text-lg font-mono font-semibold leading-none">0</span>
              <span className="text-[8px] sm:text-[9px] font-sans font-semibold tracking-wider text-stone-500 dark:text-stone-400 mt-0.5 leading-none">
                +
              </span>
            </button>
            <button
              onClick={handleBackspace}
              aria-label="Dzēst vienu"
              className="w-full aspect-square rounded-2xl bg-stone-200/50 hover:bg-stone-200 dark:bg-stone-800/40 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 transition-all duration-150 active:scale-95 flex flex-col items-center justify-center cursor-pointer border border-[#DCD5C5]/40 dark:border-[#233227]"
            >
              <span className="text-base sm:text-lg font-mono font-semibold leading-none">X</span>
              <span className="text-[7px] sm:text-[8px] font-sans font-semibold tracking-tight text-stone-500 dark:text-stone-400 mt-0.5 leading-none whitespace-nowrap">
                DZĒST VIENU
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const START_DATE_STR = "2025-11-10T00:00:00";
const START_DATE = new Date(START_DATE_STR);

interface CalendarEventType {
  date: string;
  title: string;
  description: string;
  imageUrl?: string;
}

const isSafeUrl = (url: string): boolean => {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('data:') ||
    trimmed.includes('\x00')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
};

const isImageURL = (url: string): boolean => {
  if (!isSafeUrl(url)) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  const isDirectImage = cleanUrl.endsWith('.jpg') || 
                        cleanUrl.endsWith('.jpeg') || 
                        cleanUrl.endsWith('.png') || 
                        cleanUrl.endsWith('.webp') || 
                        cleanUrl.endsWith('.gif') || 
                        cleanUrl.endsWith('.svg');
                        
  const isGoogleDrive = url.includes('drive.google.com/file/d/') || 
                        url.includes('drive.google.com/open?id=');
  
  return isDirectImage || isGoogleDrive;
};

const getDirectImageURL = (url: string): string => {
  if (!isSafeUrl(url)) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  if (url.includes('drive.google.com/open?id=')) {
    const match = url.match(/[\?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return url;
};

const estimateReadTime = (text: string): number => {
  if (!text) return 1;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 180));
};

const renderFormattedText = (text: string) => {
  if (!text) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${text}</div>`, 'text/html');
    const root = doc.body.firstChild;
    if (!root) return null;

    const linkify = (plainText: string): ReactNode => {
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
      const subParts = plainText.split(urlRegex);
      if (subParts.length === 1) return plainText;

      return subParts.map((subPart, i) => {
        if (subPart.match(urlRegex)) {
          const url = subPart.startsWith('http') ? subPart : `https://${subPart}`;
          if (!isSafeUrl(url)) return subPart;

          if (isImageURL(url)) {
            const imgSrc = getDirectImageURL(url);
            if (!imgSrc) return subPart;
            return (
              <img
                key={i}
                src={imgSrc}
                alt="Ieraksta attēls"
                className="my-6 rounded-2xl w-full max-h-[420px] object-cover mx-auto shadow-lg block border border-black/10 dark:border-white/10 transition-transform duration-500 hover:scale-[1.01]"
              />
            );
          }
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#467C32] dark:text-[#88D462] font-medium hover:underline underline-offset-4 break-all"
            >
              {subPart}
            </a>
          );
        }
        return subPart;
      });
    };

    const dangerousTags = new Set([
      'script', 'style', 'iframe', 'object', 'embed', 'meta', 'link', 'svg', 'button', 'input', 'form', 'base', 'frame', 'frameset'
    ]);

    const convertNode = (node: ChildNode, key: string): ReactNode => {
      if (node.nodeType === 3) {
        return linkify(node.textContent || '');
      }

      if (node.nodeType === 1) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Block all dangerous or executable tags
        if (dangerousTags.has(tagName)) {
          return null;
        }

        const childNodes = Array.from(element.childNodes);
        const children = childNodes.map((child, i) => convertNode(child, `${key}-${i}`));

        switch (tagName) {
          case 'div':
            return <div key={key} className="mb-3">{children}</div>;
          case 'p':
            return <p key={key} className="mb-3 leading-relaxed">{children}</p>;
          case 'b':
          case 'strong':
            return <strong key={key} className="font-semibold text-stone-900 dark:text-stone-100">{children}</strong>;
          case 'i':
          case 'em':
            return <em key={key} className="italic text-stone-700 dark:text-stone-300 font-serif">{children}</em>;
          case 'u':
            return <u key={key} className="underline underline-offset-4 decoration-[#558B2F]/50">{children}</u>;
          case 'br':
            return <br key={key} />;
          case 'a': {
            const rawHref = element.getAttribute('href') || '#';
            const safeHref = isSafeUrl(rawHref) ? rawHref : '#';
            if (isImageURL(safeHref)) {
              const imgSrc = getDirectImageURL(safeHref);
              if (!imgSrc) return null;
              return (
                <img
                  key={key}
                  src={imgSrc}
                  alt="Ieraksta attēls"
                  className="my-6 rounded-2xl w-full max-h-[420px] object-cover mx-auto shadow-lg block border border-black/10 dark:border-white/10 transition-transform duration-500 hover:scale-[1.01]"
                />
              );
            }
            return (
              <a
                key={key}
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#467C32] dark:text-[#88D462] font-medium hover:underline underline-offset-4 break-all inline-flex items-center gap-1"
              >
                <span>{children}</span>
                <ArrowUpRight className="w-3.5 h-3.5 inline opacity-70" />
              </a>
            );
          }
          default:
            return <span key={key}>{children}</span>;
        }
      }

      return null;
    };

    const children = Array.from(root.childNodes).map((child, i) => convertNode(child, `root-${i}`));
    return <>{children}</>;
  } catch (error) {
    console.error('Failed to parse HTML:', error);
    return text;
  }
};

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);

  // One-time cleanup: remove any token previously stored in localStorage
  useEffect(() => {
    localStorage.removeItem("gi_journal_token");
  }, []);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return false;
    }
    return false;
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventType[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(true);
  
  // Magazine UI State
  const [selectedPost, setSelectedPost] = useState<CalendarEventType | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});


  const formattedDate = useMemo(() => {
    const dateStr = new Intl.DateTimeFormat("lv-LV", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(currentTime);
    
    const timeStr = currentTime.toLocaleTimeString("lv-LV", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    
    return `${dateStr.charAt(0).toUpperCase()}${dateStr.slice(1)} • ${timeStr}`;
  }, [currentTime]);

  const fetchCalendar = async (token?: string) => {
    const activeToken = token ?? authToken;
    if (!activeToken) return;
    setLoadingCalendar(true);
    const fallbackEvents: CalendarEventType[] = [
      {
        date: "01.06.2026",
        title: "Pirmais solis ārpus kastes",
        description: "Šodien viss sākās. Katrs solis, lai cik mazs, ved mūs tuvāk mērķim. Šis ir pirmais ieraksts ceļojumā, kas mainīs visu. Radošums, mērķtiecība un neatlaidība ir mūsu ceļvedis."
      }
    ];
    try {
      const res = await fetch("/api/calendar", {
        headers: {
          "Authorization": `Bearer ${activeToken}`
        }
      });
      if (res.status === 401) {
        setAuthToken(null);
        return;
      }
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setCalendarEvents(data.length > 0 ? data : fallbackEvents);
        } else {
          setCalendarEvents(fallbackEvents);
        }
      } else {
        setCalendarEvents(fallbackEvents);
      }
    } catch (err) {
      console.error("Kļūda ielādējot kalendāru, tiek izmantoti rezerves dati:", err);
      setCalendarEvents(fallbackEvents);
    } finally {
      setLoadingCalendar(false);
    }
  };

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

  useEffect(() => {
    if (authToken) {
      fetchCalendar(authToken);
    }
  }, [authToken]);

  const diffMs = currentTime.getTime() - START_DATE.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const toggleLike = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedPosts((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Lead story is the first item when available (shown on desktop)
  const featuredEvent = calendarEvents.length > 0 ? calendarEvents[0] : null;

  if (!authToken) {
    return (
      <PinLockScreen
        onUnlock={(token) => setAuthToken(token)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F4F0E6] text-stone-900 dark:bg-[#0E120F] dark:text-stone-100 flex flex-col items-center selection:bg-lime-600 selection:text-white transition-colors duration-500 relative pb-24">
      {/* Ambient background blur elements for dark mode */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden hidden dark:block">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[55%] rounded-full bg-[#1c3a1b] filter blur-[140px] opacity-40 animate-float-1" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[60%] rounded-full bg-[#0e2c1e] filter blur-[140px] opacity-35 animate-float-2" />
      </div>

      <div className="w-full max-w-[1240px] px-4 sm:px-6 lg:px-8 z-10 flex flex-col">
        
        {/* Top Editorial Header */}
        <header className="w-full pt-4 pb-0 flex flex-col gap-2 select-none relative">
          {/* Controls in top right corner: Lock and Dark/Light Mode */}
          <div className="absolute top-3 right-0 sm:top-4 flex items-center gap-2 z-20">
            <button
              onClick={() => setDarkMode(!darkMode)}
              id="btn_toggle_theme"
              className="p-2 sm:p-2.5 rounded-2xl bg-stone-200/50 hover:bg-stone-200/80 dark:bg-[#141A16] dark:hover:bg-[#1c241f] border border-transparent text-stone-600 dark:text-stone-300 transition-all duration-300 flex items-center justify-center cursor-pointer"
              title={darkMode ? 'Gaišais režīms' : 'Tumšais režīms'}
              aria-label="Pārslēgt tumšo režīmu"
            >
              {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600 dark:text-stone-300" />}
            </button>
          </div>

          {/* Centered Editorial Masthead */}
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center relative"
            >
              <h1 className="font-handwritten text-7xl md:text-[4rem] lg:text-[4.75rem] font-semibold leading-none select-none tracking-tight">
                <span className="text-[#467C32] dark:text-[#88D462] transition-colors duration-500">GI</span>
                <span className="text-stone-900 dark:text-stone-50 transition-colors duration-500">žurnāls</span>
              </h1>
              
              <div className="mt-2 sm:mt-3 w-full max-w-xl flex items-center justify-center relative">
                <p className="text-stone-600 dark:text-stone-400 font-handwritten text-2xl sm:text-3xl tracking-wide px-4">
                  Ieraksti, notikumi, {calendarEvents.length > 0 ? `${calendarEvents.length} ` : ""}pārdomas
                </p>
              </div>
            </motion.div>
          </div>

          {/* Utility Top Bar (now under Tagline) */}
          <div className="w-full flex items-center justify-center pt-2 pb-6">
            <span className="text-2xl font-bold font-handwritten text-[#467C32] dark:text-[#88D462] bg-[#467C32]/10 dark:bg-[#88D462]/10 px-6 py-2 rounded-full flex items-center gap-3 border border-[#467C32]/20 dark:border-[#88D462]/20 shadow-sm">
              {totalDays} dienas
              <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse" />
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mt-2 flex flex-col gap-10">
          
          {loadingCalendar ? (
            <div className="w-full min-h-[400px] rounded-3xl border border-[#E2DDD0] dark:border-stone-800 bg-white/60 dark:bg-[#141A16]/60 flex flex-col items-center justify-center p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-[#467C32] dark:text-[#88D462] mb-4" />
              <p className="font-serif italic text-xl text-stone-600 dark:text-stone-400">
                Lādē žurnāla ierakstus...
              </p>
            </div>
          ) : (
            <>
              {/* FEATURED LEAD STORY (Shown on desktop when not searching and events exist) */}
              {featuredEvent && (
                <section className="w-full hidden md:block">
                  <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    onClick={() => setSelectedPost(featuredEvent)}
                    className="group cursor-pointer w-full rounded-3xl p-6 sm:p-10 lg:p-12 bg-[#FAF7F0] dark:bg-[#141A16]/90 border border-[#E2DDD0] dark:border-[#233227] shadow-lg hover:shadow-2xl dark:hover:border-[#88D462]/40 transition-all duration-500 flex flex-col lg:flex-row gap-8 lg:gap-12 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-2/5 h-full bg-gradient-to-l from-[#558B2F]/5 to-transparent pointer-events-none" />

                    {/* Left Column - Featured Copy */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-xs font-mono text-stone-500 dark:text-stone-400 uppercase tracking-widest font-semibold">
                            {featuredEvent.date}
                          </span>
                        </div>

                        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-semibold text-stone-900 dark:text-stone-50 leading-[1.1] mb-6 group-hover:text-[#467C32] dark:group-hover:text-[#88D462] transition-colors">
                          {featuredEvent.title}
                        </h2>

                        <div className="text-stone-700 dark:text-stone-300 text-base sm:text-lg leading-relaxed font-sans line-clamp-4">
                          {renderFormattedText(featuredEvent.description)}
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-[#E8E3D5] dark:border-[#1F2B23] flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#467C32] dark:text-[#88D462] group-hover:translate-x-1.5 transition-transform">
                          <span>Atvērt</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => toggleLike(0, e)}
                            className="p-2 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-400 transition-colors"
                            title="Patīk"
                          >
                            <Heart className={`w-4 h-4 ${likedPosts[0] ? 'fill-red-500 text-red-500' : 'hover:text-red-500'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Featured Image (if available) */}
                    {featuredEvent.imageUrl && (
                      <div className="w-full lg:w-[480px] shrink-0 rounded-2xl overflow-hidden bg-stone-200/50 dark:bg-stone-800 aspect-[4/3] lg:aspect-auto relative shadow-inner">
                        <img
                          src={getDirectImageURL(featuredEvent.imageUrl)}
                          alt={featuredEvent.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      </div>
                    )}
                  </motion.div>
                </section>
              )}

              {/* ARTICLE GRID SECTION */}
              <section className="w-full flex flex-col gap-6">
                {calendarEvents.length === 0 ? (
                  <div className="w-full min-h-[350px] rounded-3xl border border-[#E2DDD0] dark:border-stone-800 bg-white/60 dark:bg-[#141A16]/60 flex flex-col items-center justify-center p-12 text-center">
                    <BookOpen className="w-10 h-10 text-stone-400 mb-3 stroke-[1.5]" />
                    <h3 className="font-serif text-2xl text-stone-800 dark:text-stone-200">
                      Ieraksti nav atrasti
                    </h3>
                  </div>
                ) : (
                  <div className="w-full gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {calendarEvents.map((event, idx) => {
                    const globalIndex = idx;
                    const isFeaturedOnDesktop = idx === 0;
                    return (
                      <motion.article
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.6, delay: (idx % 6) * 0.05 }}
                        onClick={() => setSelectedPost(event)}
                        className={`group cursor-pointer rounded-3xl p-6 sm:p-8 bg-[#FAF7F0] dark:bg-[#141A16]/90 border border-[#E2DDD0] dark:border-[#233227] shadow-sm hover:shadow-xl dark:hover:border-[#88D462]/40 transition-all duration-400 ${
                          isFeaturedOnDesktop ? "md:hidden " : ""
                        }flex flex-col justify-between`}
                      >
                        {/* Image inside Grid Card */}
                        {event.imageUrl && (
                          <div className="w-full overflow-hidden rounded-2xl bg-stone-200/50 dark:bg-stone-800 mb-6 aspect-[16/10]">
                            <img
                              src={getDirectImageURL(event.imageUrl)}
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                          </div>
                        )}

                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            {/* Metadata Header */}
                            <div className="flex items-center justify-between text-xs font-mono text-stone-400 mb-3">
                              <span className="text-[#467C32] dark:text-[#88D462] font-semibold tracking-wider uppercase">
                                #{String(globalIndex + 1).padStart(2, '0')}
                              </span>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-stone-400" />
                                <span>{event.date}</span>
                              </div>
                            </div>

                            {/* Card Title */}
                            <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 leading-[1.2] mb-3.5 group-hover:text-[#467C32] dark:group-hover:text-[#88D462] transition-colors text-[1.95rem] sm:text-2xl">
                              {event.title}
                            </h4>

                            {/* Excerpt */}
                            {event.description && (
                              <div className="text-stone-600 dark:text-stone-300 text-[1.1rem] sm:text-sm leading-relaxed font-sans line-clamp-4 sm:line-clamp-3 mb-6">
                                {renderFormattedText(event.description)}
                              </div>
                            )}
                          </div>

                          {/* Footer action bar */}
                          <div className="pt-4 border-t border-[#E8E3D5] dark:border-[#1F2B23] flex items-center justify-between text-sm sm:text-xs">
                            <span className="font-semibold text-stone-900 dark:text-stone-200 group-hover:text-[#467C32] dark:group-hover:text-[#88D462] flex items-center gap-1 transition-colors">
                              <span>Atvērt</span>
                              <ArrowUpRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => toggleLike(globalIndex, e)}
                                className="p-1.5 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-400 transition-colors"
                                title="Patīk"
                              >
                                <Heart
                                  className={`w-3.5 h-3.5 ${
                                    likedPosts[globalIndex]
                                      ? "fill-red-500 text-red-500"
                                      : "hover:text-red-500"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
        </main>

        {/* Editorial Footer */}
        <footer className="mt-20 pt-8 border-t border-[#E2DDD0] dark:border-stone-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#467C32] dark:text-[#88D462]" />
            <span>GI JOURNAL © {currentTime.getFullYear()} • Dienu Ceļojuma Hronika</span>
          </div>
          <div>
            <span>Sākuma datums: 10.11.2025</span>
          </div>
        </footer>
      </div>

      {/* FULL ARTICLE READER LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#FAF7F0] dark:bg-[#141A16] rounded-3xl shadow-2xl border border-[#E2DDD0] dark:border-[#233227] p-6 sm:p-10 z-10 my-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                aria-label="Aizvērt"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Metadata Header */}
              <div className="flex items-center text-xs font-mono text-[#467C32] dark:text-[#88D462] mb-4">
                <span>{selectedPost.date}</span>
              </div>

              {/* Modal Article Title */}
              <h2 className="font-serif text-[2.45rem] sm:text-5xl font-bold text-stone-900 dark:text-stone-50 leading-tight mb-8">
                {selectedPost.title}
              </h2>

              {/* Featured Image in Modal */}
              {selectedPost.imageUrl && (
                <div className="w-full mb-8 rounded-2xl overflow-hidden shadow-lg border border-[#E2DDD0] dark:border-[#233227]">
                  <img
                    src={getDirectImageURL(selectedPost.imageUrl)}
                    alt={selectedPost.title}
                    className="w-full max-h-[480px] object-cover"
                  />
                </div>
              )}

              {/* Modal Body Copy */}
              <div className="font-sans text-stone-800 dark:text-stone-200 text-lg sm:text-lg leading-relaxed space-y-4">
                {renderFormattedText(selectedPost.description)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}