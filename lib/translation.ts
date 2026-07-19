import { createHash } from "node:crypto";
import { localizeLaunchName } from "@/lib/localization";

export type TranslationInput = { name: string; description: string | null; location: string | null };
export type Translation = { name_cn: string | null; mission_description_cn: string | null; location_cn: string | null };

export function translationHash(input: TranslationInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function parseTranslation(content: string): Translation {
  const value = JSON.parse(content) as Record<string, unknown>;
  const asText = (key: string) => typeof value[key] === "string" && value[key].trim() ? value[key].trim() : null;
  return {
    name_cn: asText("name_cn"),
    mission_description_cn: asText("mission_description_cn"),
    location_cn: asText("location_cn"),
  };
}

export function normalizeLaunchTranslation(input: TranslationInput, translation: Translation): Translation {
  return {
    ...translation,
    name_cn: localizeLaunchName(translation.name_cn, input.name),
  };
}

export async function translateLaunch(input: TranslationInput): Promise<Translation> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY must be configured for translations.");
  const body = {
    model: "deepseek-v4-flash",
    thinking: { type: "disabled" },
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: "Translate launch metadata into concise Simplified Chinese. Use established Chinese names for well-known rockets and constellations, including Falcon 9 = 猎鹰9号, Falcon Heavy = 猎鹰重型, and Starlink = 星链. Preserve acronyms, proper mission identifiers, model and Block numbers, and factual certainty. Do not invent details. Return JSON only with name_cn, mission_description_cn, and location_cn; use null when the source value is null.",
      },
      { role: "user", content: JSON.stringify(input) },
    ],
  };
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`DeepSeek request failed (${response.status}).`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("DeepSeek returned no translation content.");
      return normalizeLaunchTranslation(input, parseTranslation(content));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("DeepSeek translation failed.");
    }
  }
  throw lastError ?? new Error("DeepSeek translation failed.");
}
