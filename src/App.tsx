import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sun, 
  Moon, 
  RefreshCw,
  Heart,
  BookOpen
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
                        
  const isGoogleDrive = url.includes('drive.google.com/file/d/');
  
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
  return url;
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
                className="my-3 rounded-2xl max-w-full max-h-[220px] object-cover mx-auto shadow-sm block"
              />
            );
          }
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 dark:text-orange-400 hover:underline break-all"
            >
              {subPart}
            </a>
          );
        }
        return subPart;
      });
    };

    const convertNode = (node: ChildNode, key: string): ReactNode => {
      if (node.nodeType === 3) { // Text node
        return linkify(node.textContent || '');
      }

      if (node.nodeType === 1) { // Element node
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        const childNodes = Array.from(element.childNodes);
        const children = childNodes.map((child, i) => convertNode(child, `${key}-${i}`));

        switch (tagName) {
          case 'div':
            return <div key={key}>{children}</div>;
          case 'p':
            return <p key={key}>{children}</p>;
          case 'b':
          case 'strong':
            return <strong key={key} className="font-bold">{children}</strong>;
          case 'i':
          case 'em':
            return <em key={key} className="italic">{children}</em>;
          case 'u':
            return <u key={key} className="underline">{children}</u>;
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
                  className="my-3 rounded-2xl max-w-full max-h-[220px] object-cover mx-auto shadow-sm block"
                />
              );
            }
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 dark:text-orange-400 hover:underline break-all"
              >
                {children}
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

  const fetchCalendar = async () => {
    setLoadingCalendar(true);
    const fallbackEvents: CalendarEventType[] = [
      {
        date: "01.06.2026",
        title: "Pirmais solis ārpus kastes",
        description: "Šodien viss sākās. Katrs solis, lai cik mazs, ved mūs tuvāk mērķim. Šis ir pirmais ieraksts ceļojumā, kas mainīs visu."
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

  const diffMs = currentTime.getTime() - START_DATE.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return (
    <div className="relative min-h-screen w-screen bg-white text-black dark:bg-black dark:text-white flex flex-col items-center justify-center py-12 px-4">
      {/* Dark only background elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden dark:block">
        <div className="absolute top-[-10%] left-[-10%] w-[65%] h-[60%] rounded-full bg-[#4f1a0a] filter blur-[100px] sm:blur-[130px] opacity-40 animate-float-1" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[75%] h-[70%] rounded-full bg-[#1a2c3a] filter blur-[100px] sm:blur-[130px] opacity-30 animate-float-2" />
      </div>

      <main className="w-full max-w-[390px] lg:max-w-[1200px] z-10 flex flex-col lg:flex-row items-start justify-center gap-6">
        {/* Counter Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="w-full lg:w-[390px] shrink-0 lg:sticky lg:top-12 rounded-[48px] p-8 sm:p-10 relative flex flex-col justify-between bg-white border border-gray-200 shadow-sm dark:bg-white/5 dark:border-white/10 dark:shadow-none min-h-[460px]"
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
          <div className="flex flex-col items-center justify-center py-4 flex-grow">
            <div className="text-black/40 dark:text-white/20 text-xs font-semibold uppercase tracking-[0.3em] mb-4 text-center select-none">
              10.11.2025
            </div>

            <div className="relative my-4 text-center px-2 min-h-[140px] flex items-center justify-center select-none">
              <motion.div 
                key={totalDays}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-[120px] sm:text-[140px] font-extralight text-black dark:text-white leading-none tracking-tighter"
              >
                {totalDays}
              </motion.div>
              <div className="absolute -right-4 top-2 text-red-500 select-none">
                <Heart className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quote section */}
          <div className="w-full pb-2 text-center flex flex-col items-center relative gap-1 mt-auto">
            <div className="w-8 h-[1px] bg-orange-500/50 mx-auto mb-6" />

            <div className="w-full min-h-[100px] flex items-center justify-center">
              <p className="text-black dark:text-[#e0d8d0] italic text-lg sm:text-xl font-serif leading-relaxed px-4 select-none">
                “GI dienu ceļojums”
              </p>
            </div>
          </div>
        </motion.div>

        {/* Calendar Event Cards */}
        <div className={`w-full lg:max-w-[800px] flex flex-col ${calendarEvents.length > 1 ? 'md:grid md:grid-cols-2' : ''} gap-6`}>
          {loadingCalendar ? (
            <div className="w-full flex items-center justify-center p-12 text-black/40 dark:text-white/30 text-xs font-mono uppercase tracking-widest rounded-[48px] bg-white border border-gray-200 shadow-sm dark:bg-white/5 dark:border-white/10 min-h-[460px]">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
                <span>Meklē ierakstus...</span>
              </div>
            </div>
          ) : calendarEvents.length === 0 ? (
            <div className="w-full flex items-center justify-center p-12 text-black/40 dark:text-white/30 text-xs font-mono uppercase tracking-widest rounded-[48px] bg-white border border-gray-200 shadow-sm dark:bg-white/5 dark:border-white/10 min-h-[460px]">
              Nav atrasti ieraksti
            </div>
          ) : (
            calendarEvents.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.9, delay: 0.1 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-[48px] p-8 sm:p-10 relative flex flex-col justify-between bg-white border border-gray-200 shadow-sm dark:bg-white/5 dark:border-white/10 dark:shadow-none min-h-[460px]"
              >
                {/* Top card Header */}
                <div className="w-full flex justify-between items-center mb-6">
                  <span className="text-black/50 dark:text-white/40 text-[10px] sm:text-[11px] tracking-[0.15em] font-bold uppercase select-none">
                    {event.date}
                  </span>
                  <div className="flex items-center gap-1.5 text-red-500 select-none">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Core blog post section */}
                <div className="flex flex-col items-center justify-center py-4 flex-grow">
                  <div className="relative my-4 text-center px-2 min-h-[140px] flex items-center justify-center">
                    <h2 className="text-2xl sm:text-3xl font-light text-red-500 leading-tight tracking-tight font-serif italic select-none">
                      {event.title}
                    </h2>
                  </div>
                  {event.imageUrl && (
                    <img 
                      src={getDirectImageURL(event.imageUrl)} 
                      alt={event.title} 
                      className="my-3 rounded-2xl max-w-full max-h-[220px] object-cover mx-auto shadow-sm block"
                    />
                  )}
                </div>

                {/* Excerpt section */}
                {event.description && (
                  <div className="w-full pb-2 text-center flex flex-col items-center relative gap-1 mt-auto">
                    <div className="w-8 h-[1px] bg-orange-500/50 mx-auto mb-6" />

                    <div className="w-full min-h-[100px] flex items-center justify-center">
                      <p className="text-black dark:text-[#e0d8d0] italic text-lg sm:text-xl font-serif leading-relaxed px-4 whitespace-pre-wrap">
                        “{renderFormattedText(event.description)}”
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}