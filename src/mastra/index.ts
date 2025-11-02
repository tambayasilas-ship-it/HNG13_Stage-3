import "dotenv/config";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { studySyncAgent } from "./agents/studySyncAgent.ts";

export const mastra = new Mastra({
  agents: { studySyncAgent },
  storage: new LibSQLStore({
    url: "file:./studysync-storage.db",
  }),
  models: {
    gemini: {
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    },
  },
});
