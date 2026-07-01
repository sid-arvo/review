import { hasChatAI } from "@/lib/env";
import { getChatClient, CHAT_MODEL, REASONING_EFFORT_OPTION } from "@/lib/ai/openai-client";

export async function translateToEnglish(text: string, sourceLanguage: string): Promise<string | undefined> {
  if (sourceLanguage === "en" || !hasChatAI()) return undefined;
  try {
    const chatClient = getChatClient();
    const completion = await chatClient.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: "Translate the following user feedback to English. Return only the translation, no commentary." },
        { role: "user", content: text },
      ],
      temperature: 0,
      ...REASONING_EFFORT_OPTION,
    });
    return completion.choices[0].message.content?.trim();
  } catch (err) {
    console.error("[translate] failed:", (err as Error).message);
    return undefined;
  }
}
