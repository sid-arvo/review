import { hasOpenAI } from "@/lib/env";
import { getOpenAI, CHAT_MODEL } from "@/lib/ai/openai-client";

export async function translateToEnglish(text: string, sourceLanguage: string): Promise<string | undefined> {
  if (sourceLanguage === "en" || !hasOpenAI()) return undefined;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: "Translate the following user feedback to English. Return only the translation, no commentary." },
        { role: "user", content: text },
      ],
      temperature: 0,
    });
    return completion.choices[0].message.content?.trim();
  } catch (err) {
    console.error("[translate] failed:", (err as Error).message);
    return undefined;
  }
}
