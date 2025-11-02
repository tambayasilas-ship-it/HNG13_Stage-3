import "dotenv/config";
import express from "express";
import cors from "cors";
import { mastra } from "./mastra/index.ts";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4111;

// 🧠 Root health check
app.get("/", (req, res) => {
  res.json({
    status: "StudySync Agent API is running ✅",
    message: "Welcome to StudySync — your AI study accountability partner!",
  });
});


// 🎯 Main agent chat route
app.post("/a2a/agent/studySyncAgent", async (req, res) => {
  try {
    const { sender, text } = req.body;
    let userSessions: Record<string, boolean> = {};

    function userHasPreviousSession(userId: string): boolean {
      return !!userSessions[userId];
    }
    if (!userHasPreviousSession(sender.id)) {
      return res.json({
        text: `Hey ${sender.name}! 👋 I'm StudySync — your AI study accountability partner. 
I'm here to help you set realistic goals, stay focused, and celebrate your progress. 
What’s something you’d like to achieve today?`,
      });
    }

    if (!sender?.id || !text) {
      return res.status(400).json({
        error: "Missing sender.id or text in request body.",
      });
    }

    const response = await mastra.getAgent("studySyncAgent").generate(
      [
        {
          role: "user",
          content: `${sender.name || "User"} says: ${text}`,
        },
      ],
      {
        memory: {
          resource: sender.id,
          thread: sender.id,
        },
      }
    );

    res.json({
      reply: response.text,
    });
  } catch (err: any) {
    console.error("Agent Error:", err);
    res.status(500).json({ error: err.message || "Agent failed to respond." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 StudySync API running on: http://localhost:${PORT}`);
  console.log(
    `📡 Try POST → http://localhost:${PORT}/a2a/agent/studySyncAgent`
  );
});
