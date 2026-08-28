import React, { useState, useEffect, ReactNode, useMemo, MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sun, 
  Moon, 
  RefreshCw,
  Heart,
  BookOpen,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  X,
  Sparkles,
  ArrowUpRight
} from "lucide-react";

const START_DATE_STR = "2025-11-10T00:00:00";
const START_DATE = new Date(START_DATE_STR);

interface CalendarEventType {
  date: string;
  title: string;
  description: string;
  imageUrl?: string;
}

const isImageURL = (url: string): boolean => {
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
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/file\/d\/([^\/]+)/);
    if (match && match[1]) {
      const fileId = match[1].split('?')[0].split('/')[0];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  if (url.includes('drive.google.com/open?id=')) {
    const match = url.match(/[\?&]id=([^&]+)/);
    if (match && match[1]) {
      const fileId = match[1].split('?')[0].split('/')[0];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
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
          if (isImageURL(url)) {
            return (
              <img
                key={i}
                src={getDirectImageURL(url)}
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

    const convertNode = (node: ChildNode, key: string): ReactNode => {
      if (node.nodeType === 3) {
        return linkify(node.textContent || '');
      }

      if (node.nodeType === 1) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
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
            const href = element.getAttribute('href') || '#';
            if (isImageURL(href)) {
              return (
                <img
                  key={key}
                  src={getDirectImageURL(href)}
                  alt="Ieraksta attēls"
                  className="my-6 rounded-2xl w-full max-h-[420px] object-cover mx-auto shadow-lg block border border-black/10 dark:border-white/10 transition-transform duration-500 hover:scale-[1.01]"
                />
              );
            }
            return (
              <a
                key={key}
                href={href}
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
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

  const fetchCalendar = async () => {
    setLoadingCalendar(true);
    const fallbackEvents: CalendarEventType[] = [
      {
        date: "01.06.2026",
        title: "Pirmais solis ārpus kastes",
        description: "Šodien viss sākās. Katrs solis, lai cik mazs, ved mūs tuvāk mērķim. Šis ir pirmais ieraksts ceļojumā, kas mainīs visu. Radošums, mērķtiecība un neatlaidība ir mūsu ceļvedis."
      }
    ];
    try {
      const res = await fetch("/api/calendar");
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
    fetchCalendar();
  }, []);

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return calendarEvents;
    const query = searchQuery.toLowerCase();
    return calendarEvents.filter(
      (ev) =>
        ev.title.toLowerCase().includes(query) ||
        ev.description.toLowerCase().includes(query) ||
        ev.date.toLowerCase().includes(query)
    );
  }, [calendarEvents, searchQuery]);

  const diffMs = currentTime.getTime() - START_DATE.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const toggleLike = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedPosts((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Lead story is the first item when available and no search is active
  const featuredEvent = !searchQuery && filteredEvents.length > 0 ? filteredEvents[0] : null;
  const gridEvents = !searchQuery && filteredEvents.length > 0 ? filteredEvents.slice(1) : filteredEvents;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F4F0E6] text-stone-900 dark:bg-[#0E120F] dark:text-stone-100 flex flex-col items-center selection:bg-lime-600 selection:text-white transition-colors duration-500 relative pb-24">
      {/* Ambient background blur elements for dark mode */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden hidden dark:block">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[55%] rounded-full bg-[#1c3a1b] filter blur-[140px] opacity-40 animate-float-1" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[60%] rounded-full bg-[#0e2c1e] filter blur-[140px] opacity-35 animate-float-2" />
      </div>

      <div className="w-full max-w-[1240px] px-4 sm:px-6 lg:px-8 z-10 flex flex-col">
        
        {/* Top Editorial Header */}
        <header className="w-full pt-4 pb-6 flex flex-col gap-2 select-none">
          {/* Centered Editorial Masthead */}
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center relative"
            >
              <h1 className="font-handwritten text-7xl sm:text-8xl md:text-9xl lg:text-[9.5rem] font-semibold leading-none select-none tracking-tight">
                <span className="text-[#467C32] dark:text-[#88D462] transition-colors duration-500">GI</span>
                <span className="text-stone-900 dark:text-stone-50 transition-colors duration-500">žurnāls</span>
              </h1>
              
              <div className="mt-3 sm:mt-5 w-full max-w-xl flex items-center justify-center relative">
                <p className="text-stone-700 dark:text-stone-300 font-serif italic text-lg sm:text-xl tracking-wider px-4">
                  Ieraksti, notikumi, pārdomas
                </p>
              </div>
            </motion.div>
          </div>

          {/* Utility Top Bar (now under Tagline) */}
          <div className="w-full flex items-center justify-center py-2">
            <span className="text-2xl font-bold font-handwritten text-[#467C32] dark:text-[#88D462] bg-[#467C32]/10 dark:bg-[#88D462]/10 px-6 py-2 rounded-full flex items-center gap-3 border border-[#467C32]/20 dark:border-[#88D462]/20 shadow-sm">
              {totalDays} dienas
              <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse" />
            </span>
          </div>

          {/* Controls & Filter Bar */}
          <div className="flex flex-col items-center gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-80 group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#467C32] dark:group-focus-within:text-[#88D462] transition-colors" />
              <input
                type="text"
                placeholder="Meklēt rakstos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl bg-stone-200/40 hover:bg-stone-200/60 focus:bg-white dark:bg-[#141A16] dark:hover:bg-[#18211b] dark:focus:bg-[#111612] border border-[#DCD5C5] dark:border-[#233227] focus:border-[#467C32] dark:focus:border-[#88D462] focus:ring-2 focus:ring-[#467C32]/10 dark:focus:ring-[#88D462]/10 focus:outline-none transition-all duration-300 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-0.5 rounded-full hover:bg-stone-300/40 dark:hover:bg-stone-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right Controls: toggle on top, counter below */}
            <div className="flex flex-col items-center gap-2 sm:items-end">
              {/* Segmented layout controller */}
              <div className="flex items-center gap-1 bg-stone-200/50 dark:bg-[#141A16] p-1 rounded-2xl border border-[#DCD5C5] dark:border-[#233227]">
                <button
                  onClick={() => setLayoutMode("grid")}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-300 ${
                    layoutMode === "grid"
                      ? "bg-white dark:bg-stone-800 text-[#467C32] dark:text-[#88D462] shadow-sm font-semibold border border-[#DCD5C5]/30 dark:border-[#233227]/50"
                      : "text-stone-500 hover:text-stone-950 dark:hover:text-stone-200 font-medium"
                  }`}
                  title="Žurnāla Tīkls"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Kartiņas</span>
                </button>

                <button
                  onClick={() => setLayoutMode("list")}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-300 ${
                    layoutMode === "list"
                      ? "bg-white dark:bg-stone-800 text-[#467C32] dark:text-[#88D462] shadow-sm font-semibold border border-[#DCD5C5]/30 dark:border-[#233227]/50"
                      : "text-stone-500 hover:text-stone-950 dark:hover:text-stone-200 font-medium"
                  }`}
                  title="Saraksta Skats"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Saraksts</span>
                </button>

                {/* Dark/Light Mode Toggle */}
                <div className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1" />
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  id="btn_toggle_theme"
                  className="p-1.5 rounded-xl text-xs flex items-center justify-center transition-all duration-300 text-stone-500 hover:text-stone-950 dark:hover:text-stone-200 hover:bg-white/40 dark:hover:bg-stone-800/40"
                  title={darkMode ? 'Gaišais režīms' : 'Tumšais režīms'}
                  aria-label="Pārslēgt tumšo režīmu"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Post counter below the toggle */}
              <span className="text-xs font-mono tracking-wider text-stone-400 dark:text-stone-500">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'ieraksts' : 'ieraksti'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mt-8 flex flex-col gap-12">
          
          {loadingCalendar ? (
            <div className="w-full min-h-[400px] rounded-3xl border border-[#E2DDD0] dark:border-stone-800 bg-white/60 dark:bg-[#141A16]/60 flex flex-col items-center justify-center p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-[#467C32] dark:text-[#88D462] mb-4" />
              <p className="font-serif italic text-xl text-stone-600 dark:text-stone-400">
                Lādē žurnāla ierakstus...
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="w-full min-h-[350px] rounded-3xl border border-[#E2DDD0] dark:border-stone-800 bg-white/60 dark:bg-[#141A16]/60 flex flex-col items-center justify-center p-12 text-center">
              <BookOpen className="w-10 h-10 text-stone-400 mb-3 stroke-[1.5]" />
              <h3 className="font-serif text-2xl text-stone-800 dark:text-stone-200">
                Ieraksti nav atrasti
              </h3>
              <p className="text-sm text-stone-500 mt-1 max-w-md">
                Mēģiniet izmantot citu meklēšanas frāzi vai notīrīt meklētāju.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 px-4 py-2 text-xs font-mono uppercase tracking-wider bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-full hover:opacity-90 transition-opacity"
              >
                Notīrīt meklēšanu
              </button>
            </div>
          ) : (
            <>
              {/* FEATURED LEAD STORY (Shown when not searching and events exist) */}
              {featuredEvent && (
                <section className="w-full">
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
                          <span>Lasīt pilnu rakstu</span>
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

              {/* ARTICLE GRID / LIST SECTION */}
              <section className="w-full flex flex-col gap-6">

                <div
                  className={`w-full gap-6 ${
                    layoutMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col"
                  }`}
                >
                  {gridEvents.map((event, idx) => {
                    const globalIndex = searchQuery ? idx : idx + 1;
                    return (
                      <motion.article
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.6, delay: (idx % 6) * 0.05 }}
                        onClick={() => setSelectedPost(event)}
                        className={`group cursor-pointer rounded-3xl p-6 sm:p-8 bg-[#FAF7F0] dark:bg-[#141A16]/90 border border-[#E2DDD0] dark:border-[#233227] shadow-sm hover:shadow-xl dark:hover:border-[#88D462]/40 transition-all duration-400 flex ${
                          layoutMode === "list"
                            ? "flex-col md:flex-row md:items-center gap-6"
                            : "flex-col justify-between"
                        }`}
                      >
                        {/* Image inside Grid Card */}
                        {event.imageUrl && (
                          <div
                            className={`w-full overflow-hidden rounded-2xl bg-stone-200/50 dark:bg-stone-800 mb-6 ${
                              layoutMode === "list"
                                ? "md:w-60 md:mb-0 shrink-0 aspect-[16/10]"
                                : "aspect-[16/10]"
                            }`}
                          >
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
                            <h4 className={`font-serif font-semibold text-stone-900 dark:text-stone-100 leading-tight mb-3 group-hover:text-[#467C32] dark:group-hover:text-[#88D462] transition-colors ${
                              layoutMode === "list" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                            }`}>
                              {event.title}
                            </h4>

                            {/* Excerpt */}
                            {event.description && (
                              <div className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed font-sans line-clamp-3 mb-6">
                                {renderFormattedText(event.description)}
                              </div>
                            )}
                          </div>

                          {/* Footer action bar */}
                          <div className="pt-4 border-t border-[#E8E3D5] dark:border-[#1F2B23] flex items-center justify-between text-xs">
                            <span className="font-semibold text-stone-900 dark:text-stone-200 group-hover:text-[#467C32] dark:group-hover:text-[#88D462] flex items-center gap-1 transition-colors">
                              <span>Lasīt tālāk</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
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
              <div className="flex items-center gap-3 text-xs font-mono text-[#467C32] dark:text-[#88D462] mb-4">
                <span className="px-2.5 py-0.5 rounded-full bg-[#558B2F]/10 dark:bg-[#88D462]/10 border border-[#558B2F]/20 uppercase tracking-widest">
                  IERAKSTS
                </span>
                <span>•</span>
                <span>{selectedPost.date}</span>
              </div>

              {/* Modal Article Title */}
              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 dark:text-stone-50 leading-tight mb-8">
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
              <div className="font-sans text-stone-800 dark:text-stone-200 text-base sm:text-lg leading-relaxed space-y-4">
                {renderFormattedText(selectedPost.description)}
              </div>

              {/* Modal Footer */}
              <div className="mt-10 pt-6 border-t border-[#E8E3D5] dark:border-[#1F2B23] flex items-center justify-between">
                <span className="text-xs font-mono text-stone-400">
                  Pievienots GI Hronikai
                </span>

                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-6 py-2.5 rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-mono uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Aizvērt lasītāju
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}