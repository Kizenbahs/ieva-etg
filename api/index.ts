import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Initialize Gemini SDK with client user-agent for telemetry
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.log("GEMINI_API_KEY environment variable is not defined. Falling back to curated quotes.");
}

// Fallback quotes list in Latvian
const fallbackQuotes = [
  { quote: "Katrs solis, ziņā lai cik mazs, ved tevi tuvāk mērķim.", author: "Latviešu sakāmvārds" },
  { quote: "Lielas lietas sastāv no maziem darbiem, kas paveikti dienu pēc dienas.", author: "Lao Czi" },
  { quote: "Tavs vienīgais ierobežojums ir tava iztēle un griba rīkoties.", author: "Nezināms" },
  { quote: "Tavs vienīgais sāncensis ir tas cilvēks, kas tu biji vakar.", author: "Nezināms" },
  { quote: "Konsekvence un neatlaidība vienmēr uzvar pār mirkļa iedvesmu.", author: "Nezināms" },
  { quote: "Nekad nenovērtē par zemu to progresu, ko spēj sniegt katra jauna diena.", author: "Nezināms" },
  { quote: "Katrs rīts ir jauna lapa tavā stāstā. Raksti to drosmīgi.", author: "Nezināms" },
  { quote: "Vispirms viņi tevi ignorē, tad par tevi smejas, tad cīnās, un tad tu uzvari.", author: "Mahatma Gandijs" },
  { quote: "Lai gūtu panākumus, tavam vēlmes dzinulim jābūt lielākam par bailēm no neveiksmes.", author: "Alberts Einšteins" },
  { quote: "Darbi rādīs ceļu, vārdi tikai skaņu radīs.", author: "Latviešu sakāmvārds" },
  { quote: "Labi iesākts ir puspaveikts.", author: "Aristotelis" },
  { quote: "Tas, ko mēs darām šodien, nosaka to, kā mēs dzīvosim rīt.", author: "Nezināms" },
  { quote: "Tūkstoš jūdžu ceļojums sākas ar vienu vienīgu soli.", author: "Lao Czi" },
  { quote: "Ja tu gribi piedzīvot kaut ko tādu, ko nekad neesi pieredzējis, tev jādara kaut kas tāds, ko nekad neesi darījis.", author: "Nezināms" },
  { quote: "Dzīve nav sevis meklēšana. Dzīve ir sevis radīšana.", author: "Džordžs Bernards Šovs" }
];

// In-memory cache for target quotes by date string (YYYY-MM-DD)
const quoteCache: Record<string, { quote: string; author: string }> = {};

app.use(express.json());

// API: Get daily motivational quote in Latvian
app.get("/api/quote", async (req, res) => {
  const todayStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
  
  // Return cached quote if exists
  if (quoteCache[todayStr]) {
    return res.json(quoteCache[todayStr]);
  }

  // Attempt to use Gemini API
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate a beautiful, short, uplifting daily motivational quote in the Latvian language. 
The quote should be highly inspiring, emphasizing consistency, patience, self-improvement, time, or starting small.
Write in natural, fluent, elegant Latvian.
Provide the response as JSON containing fields "quote" (string) and "author" (string).
Use this seed string to maintain consistency for this date: ${todayStr}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quote: {
                type: Type.STRING,
                description: "A short, beautiful, uplifting motivational quote in Latvian.",
              },
              author: {
                type: Type.STRING,
                description: "The author of the quote, or standard author representation.",
              }
            },
            required: ["quote", "author"]
          },
          temperature: 0.7,
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text.trim());
        if (parsed && typeof parsed.quote === 'string' && typeof parsed.author === 'string') {
          // Cache and return
          quoteCache[todayStr] = parsed;
          return res.json(parsed);
        }
      }
    } catch (error) {
      console.error("Gemini API quote request failed, returning solid Latvian fallback quote. Error:", error);
    }
  }

  // Pure mathematical seed based on date string so it's consistent for today using fallbacks
  const dateHash = todayStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const fallbackIndex = dateHash % fallbackQuotes.length;
  const chosenFallback = fallbackQuotes[fallbackIndex];
  
  res.json(chosenFallback);
});

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

app.get("/api/calendar", async (req, res) => {
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
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&singleEvents=true&supportsAttachments=true`;
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
      const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
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