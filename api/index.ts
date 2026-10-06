import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ---------------------------------------------------------------------------
// Rate Limiter — in-memory sliding window per IP
// ---------------------------------------------------------------------------
type RateLimitStore = Map<string, number[]>; // IP -> array of request timestamps (ms)

function createRateLimiter(maxRequests: number, windowMs: number) {
  const store: RateLimitStore = new Map();

  // Clean up old entries every 5 minutes to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of store.entries()) {
      const recent = timestamps.filter(t => now - t < windowMs);
      if (recent.length === 0) store.delete(ip);
      else store.set(ip, recent);
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const now = Date.now();
    const timestamps = (store.get(ip) || []).filter(t => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
      res.status(429).json({ error: "Pārāk daudz pieprasījumu. Mēģini vēlāk." });
      return;
    }

    timestamps.push(now);
    store.set(ip, timestamps);
    next();
  };
}

// 30 requests / minute for calendar
const calendarLimiter = createRateLimiter(30, 60 * 1000);
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Security Headers — applied to every response
// ---------------------------------------------------------------------------
app.disable("x-powered-by"); // Don't advertise Express

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'"
  );
  res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
});
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CORS — only allow requests from the configured origin
// ---------------------------------------------------------------------------
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || "";
  // Allow same-origin requests (no Origin header) and the configured domain
  if (!origin || origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
});
// ---------------------------------------------------------------------------

app.use(express.json());

function isFutureEvent(dateStr: string) {
  if (dateStr === "Nezināms") return false;
  const parts = dateStr.split(".");
  if (parts.length < 3) return false;
  const eventDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate.getTime() > today.getTime();
}

function parseICS(icsString: string) {
  const events: Array<{ date: string; title: string; description: string }> = [];
  const veventBlocks = icsString.split("BEGIN:VEVENT");
  veventBlocks.shift();

  for (const block of veventBlocks) {
    const lines = block.split(/\r?\n/);
    let title = "";
    let description = "";
    let dateStr = "";

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      while (i + 1 < lines.length && (lines[i+1].startsWith(" ") || lines[i+1].startsWith("\t"))) {
        line += lines[i+1].substring(1);
        i++;
      }

      if (line.startsWith("SUMMARY:")) {
        title = line.replace("SUMMARY:", "").trim();
      } else if (line.startsWith("DESCRIPTION:")) {
        description = line.replace("DESCRIPTION:", "")
          .replace(/\\n/g, "\n")
          .replace(/\\,/g, ",")
          .replace(/\\;/g, ";")
          .replace(/\\\\/g, "\\")
          .trim();
      } else if (line.startsWith("DTSTART")) {
        const parts = line.split(":");
        const val = parts[parts.length - 1].trim();
        if (val.length >= 8) {
          const year = val.substring(0, 4);
          const month = val.substring(4, 6);
          const day = val.substring(6, 8);
          dateStr = `${day}.${month}.${year}`;

          if (val.includes("T")) {
            const tIndex = val.indexOf("T");
            const hourPart = val.substring(tIndex + 1, tIndex + 3);
            const minPart = val.substring(tIndex + 3, tIndex + 5);
            const isUTC = val.endsWith("Z");
            const isoString = `${year}-${month}-${day}T${hourPart}:${minPart}:00${isUTC ? "Z" : ""}`;
            try {
              const dateObj = new Date(isoString);
              const localDay = String(dateObj.getDate()).padStart(2, '0');
              const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
              const localYear = dateObj.getFullYear();
              const localHours = String(dateObj.getHours()).padStart(2, '0');
              const localMinutes = String(dateObj.getMinutes()).padStart(2, '0');
              dateStr = `${localDay}.${localMonth}.${localYear}.${localHours}:${localMinutes}`;
            } catch (err) {
              dateStr = `${day}.${month}.${year}.${hourPart}:${minPart}`;
            }
          }
        }
      }
    }

    if (title || description) {
      events.push({
        date: dateStr || "Nezināms",
        title: title || "Bez virsraksta",
        description: description || ""
      });
    }
  }

  events.sort((a, b) => {
    const getParts = (d: string) => {
      const parts = d.split(".");
      const year = parts[2] || "1970";
      const month = parts[1] || "01";
      const day = parts[0] || "01";
      const time = parts[3] || "00:00";

      const dateOnlyMs = new Date(`${year}-${month}-${day}T00:00:00`).getTime();
      const timeParts = time.split(":");
      const timeMs = (Number(timeParts[0]) * 60 + Number(timeParts[1])) * 60 * 1000;

      return { dateOnlyMs, timeMs };
    };

    const aInfo = getParts(a.date);
    const bInfo = getParts(b.date);

    if (aInfo.dateOnlyMs !== bInfo.dateOnlyMs) {
      return bInfo.dateOnlyMs - aInfo.dateOnlyMs;
    } else {
      return bInfo.timeMs - aInfo.timeMs;
    }
  });

  return events;
}

app.get("/api/calendar", calendarLimiter, async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  console.log("[API] GOOGLE_CALENDAR_ID exists:", !!calendarId);
  console.log("[API] GOOGLE_API_KEY exists:", !!apiKey);

  if (!calendarId) {
    const fallback = [
      {
        date: "01.06.2026",
        title: "Pirmais solis ārpus kastes",
        description: "Šodien viss sākās. Katrs solis, lai cik mazs, ved mūs tuvāk mērķim. Šis ir pirmais ieraksts ceļojumā, kas mainīs visu."
      }
    ];
    return res.json(fallback.filter(event => !isFutureEvent(event.date)));
  }

  try {
    if (apiKey) {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&singleEvents=true&supportsAttachments=true&t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google API returned status ${response.status}`);
      }
      const data: any = await response.json();
      const items = data.items || [];
      const events = items.map((item: any) => {
        const start = item.start?.date || item.start?.dateTime || "";
        let dateStr = "Nezināms";
        if (start) {
          const dateObj = new Date(start);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          dateStr = `${day}.${month}.${year}`;

          if (item.start?.dateTime) {
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            dateStr = `${dateStr}.${hours}:${minutes}`;
          }
        }

        let imageUrl = "";
        if (item.attachments && item.attachments.length > 0) {
          const imgAttachment = item.attachments.find((att: any) =>
            att.mimeType?.startsWith("image/") ||
            att.title?.toLowerCase().endsWith(".jpg") ||
            att.title?.toLowerCase().endsWith(".jpeg") ||
            att.title?.toLowerCase().endsWith(".png") ||
            att.title?.toLowerCase().endsWith(".webp") ||
            att.title?.toLowerCase().endsWith(".gif")
          );
          if (imgAttachment) {
            imageUrl = imgAttachment.fileUrl || "";
          }
        }

        return {
          date: dateStr,
          title: item.summary || "Bez virsraksta",
          description: item.description || "",
          imageUrl: imageUrl
        };
      });

      events.sort((a: any, b: any) => {
        const getParts = (d: string) => {
          const parts = d.split(".");
          const year = parts[2] || "1970";
          const month = parts[1] || "01";
          const day = parts[0] || "01";
          const time = parts[3] || "00:00";

          const dateOnlyMs = new Date(`${year}-${month}-${day}T00:00:00`).getTime();
          const timeParts = time.split(":");
          const timeMs = (Number(timeParts[0]) * 60 + Number(timeParts[1])) * 60 * 1000;

          return { dateOnlyMs, timeMs };
        };

        const aInfo = getParts(a.date);
        const bInfo = getParts(b.date);

        if (aInfo.dateOnlyMs !== bInfo.dateOnlyMs) {
          return bInfo.dateOnlyMs - aInfo.dateOnlyMs;
        } else {
          return bInfo.timeMs - aInfo.timeMs;
        }
      });

      const filteredEvents = events.filter((event: any) => !isFutureEvent(event.date));
      return res.json(filteredEvents);
    } else {
      const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics?t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`iCal feed returned status ${response.status}`);
      }
      const icsText = await response.text();
      const events = parseICS(icsText);
      const filteredEvents = events.filter((event: any) => !isFutureEvent(event.date));
      return res.json(filteredEvents);
    }
  } catch (error) {
    console.error("Kļūda iegūstot kalendāra datus:", error);
    const fallback = [
      {
        date: "01.06.2026",
        title: "Pirmais solis ārpus kastes",
        description: "Šodien viss sākās. Katrs solis, lai cik mazs, ved mūs tuvāk mērķim. Šis ir pirmais ieraksts ceļojumā, kas mainīs visu. (Kļūda ielādējot Google kalendāru)"
      }
    ];
    return res.json(fallback.filter(event => !isFutureEvent(event.date)));
  }
});

// Serve static files in production
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

export default app;