import OpenAI from "openai";
import { z } from "zod";
import type { Analysis, Article } from "./types";
import { PublicError } from "./api-errors";

const MODEL = "gpt-4o-mini";

const analysisSchema = z.object({
  summary: z.string().min(1),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  sentimentScore: z.number().min(0).max(1),
  topics: z.array(z.string().min(1)).min(1).max(3),
});

/**
 * Normalize a topic tag for grouping. Lowercases, strips punctuation/suffixes,
 * collapses whitespace. Display layer can re-title-case if it likes.
 */
function normalizeTopic(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u201C\u201D"']/g, "")
    .replace(/[.,;:]+$/g, "")
    .replace(/\s+(inc|corp|corporation|ltd|llc|co)\.?$/i, "")
    .replace(/\s+/g, " ");
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env.local.");
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

const SYSTEM_PROMPT = `You are a concise news analyst. For each article you receive, return a JSON object with EXACTLY these fields and no others:

- "summary": a 2-4 sentence neutral summary of what the article is about. Do not editorialize.
- "sentiment": one of "positive", "neutral", or "negative" describing the overall tone of the article toward its main subject.
- "sentimentScore": a number between 0 and 1 representing your confidence in the chosen sentiment label.
- "topics": an array of 1 to 3 short canonical topic tags that group this article with related coverage. Use the most common, recognizable form of each entity or theme (e.g. "Tesla" not "Tesla Inc.", "OpenAI" not "Open AI", "AI Regulation" not "Regulating AI"). Prefer well-known company names, people, or broad themes over hyper-specific phrases. Lowercase or capitalized is fine \u2014 we normalize.

Respond with ONLY the JSON object, no markdown fences, no commentary.`;

export async function analyzeWithOpenAI(article: Article): Promise<Analysis> {
  const userMessage = [
    `Title: ${article.title}`,
    `Source: ${article.source}`,
    `Published: ${article.publishedAt}`,
    "",
    `Description: ${article.description || "(no description provided)"}`,
  ].join("\n");

  let completion;
  try {
    completion = await client().chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });
  } catch (err) {
    // Surface quota / rate-limit errors so the UI can show a helpful toast.
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      throw new PublicError("AI service is rate-limited. Try again in a moment.", 503);
    }
    if (status === 401 || status === 403) {
      throw new PublicError("AI service is not configured correctly.", 503);
    }
    throw err;
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }

  const result = analysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`OpenAI response did not match schema: ${result.error.message}`);
  }

  // Normalize + dedupe topics for stable grouping.
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const raw of result.data.topics) {
    const norm = normalizeTopic(raw);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      topics.push(norm);
    }
  }

  return {
    summary: result.data.summary,
    sentiment: result.data.sentiment,
    sentimentScore: Number(result.data.sentimentScore.toFixed(2)),
    topics,
  };
}
