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

// Serve static files in production
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

export default app;