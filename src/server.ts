import "dotenv/config";
import express from "express";
import cors from "cors";
import { mastra } from "./mastra/index.js";

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "StudySync Agent API",
  });
});

// 🎯 Main agent chat route - UPDATED FOR TELEX JSON-RPC
app.post("/a2a/agent/studySyncAgent", async (req, res) => {
  console.log("📥 Received Telex JSON-RPC request");

  try {
    // TELEX SENDS JSON-RPC 2.0 FORMAT
    const { jsonrpc, id, method, params } = req.body;

    // Validate JSON-RPC 2.0
    if (jsonrpc !== "2.0") {
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Invalid Request" },
      });
    }

    if (method !== "message/send") {
      return res.json({
        jsonrpc: "2.0",
        id: id,
        error: { code: -32601, message: "Method not found" },
      });
    }

    const message = params?.message;
    if (!message) {
      return res.json({
        jsonrpc: "2.0",
        id: id,
        error: { code: -32602, message: "Invalid params" },
      });
    }

    // Extract text from parts array
    let messageText = "";
    const parts = message.parts || [];

    console.log("🔍 Processing", parts.length, "message parts");

    // Find the last clean text part (skip HTML, errors, system messages)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.kind === "text" && part.text && part.text.trim().length > 0) {
        const cleanText = part.text.replace(/<[^>]*>/g, "").trim();

        // Skip system messages, errors, and empty texts
        if (
          cleanText &&
          !cleanText.includes("ERROR") &&
          !cleanText.includes("WebSocket") &&
          !cleanText.includes("Analyzing") &&
          !cleanText.includes("Let me") &&
          cleanText.length > 10
        ) {
          messageText = cleanText;
          console.log("✅ Found user message:", messageText);
          break;
        }
      }
    }

    // Fallback: use any text part if no clean message found
    if (!messageText) {
      const textParts = parts.filter(
        (p: any) => p.kind === "text" && p.text?.trim()
      );
      if (textParts.length > 0) {
        const lastPart = textParts[textParts.length - 1];
        messageText = lastPart.text.replace(/<[^>]*>/g, "").trim();
        console.log("🔄 Using fallback message:", messageText);
      }
    }

    const userId = message.metadata?.telex_user_id || `user-${Date.now()}`;

    console.log(`👤 User: ${userId}, Message: "${messageText}"`);

    // Handle empty message (first interaction)
    if (!messageText || messageText.trim().length === 0) {
      console.log("🆕 Sending welcome message");
      return res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          id: `msg-${Date.now()}`,
          contextId: `ctx-${Date.now()}`,
          status: {
            state: "completed",
            timestamp: new Date().toISOString(),
            message: {
              messageId: `resp-${Date.now()}`,
              role: "agent",
              parts: [
                {
                  kind: "text",
                  text: `👋 Hello! I'm StudySync, your AI study partner! I help with study planning, motivation, and learning techniques. What would you like to learn today? 📚`,
                },
              ],
              kind: "message",
            },
          },
        },
      });
    }

    console.log("🤖 Generating study-focused response...");

    // Use Mastra for intelligent study-focused responses
    try {
      const agent = mastra.getAgent("studySyncAgent");

      if (agent) {
        const response = await agent.generate(
          [
            {
              role: "system",
              content: `You are StudySync, an AI study accountability partner. Be encouraging, practical, and focused on study techniques. Help with study planning, progress tracking, and motivation. Keep responses conversational but informative.`,
            },
            {
              role: "user",
              content: messageText,
            },
          ],
          {
            memory: {
              resource: userId,
              thread: userId,
            },
            maxSteps: 3,
          }
        );

        console.log("✅ Agent response generated");

        return res.json({
          jsonrpc: "2.0",
          id: id,
          result: {
            id: `msg-${Date.now()}`,
            contextId: `ctx-${Date.now()}`,
            status: {
              state: "completed",
              timestamp: new Date().toISOString(),
              message: {
                messageId: `resp-${Date.now()}`,
                role: "agent",
                parts: [
                  {
                    kind: "text",
                    text: response.text,
                  },
                ],
                kind: "message",
              },
            },
          },
        });
      }
    } catch (mastraError: any) {
      console.log("❌ Mastra error:", mastraError.message);
    }

    // Fallback study-focused response
    const fallbackResponse = `I'd love to help you with your studies! As StudySync, I specialize in:\n\n• Creating personalized study plans 📅\n• Tracking your learning progress 📊\n• Recommending effective study techniques 💡\n• Keeping you motivated and accountable 🎯\n\nWhat specific subject or study challenge can I help you with today?`;

    return res.json({
      jsonrpc: "2.0",
      id: id,
      result: {
        id: `msg-${Date.now()}`,
        contextId: `ctx-${Date.now()}`,
        status: {
          state: "completed",
          timestamp: new Date().toISOString(),
          message: {
            messageId: `resp-${Date.now()}`,
            role: "agent",
            parts: [
              {
                kind: "text",
                text: fallbackResponse,
              },
            ],
            kind: "message",
          },
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Server error:", error);
    return res.json({
      jsonrpc: "2.0",
      id: req.body?.id || null,
      error: {
        code: -32000,
        message: "Internal server error",
      },
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    available_endpoints: [
      "GET /",
      "GET /health",
      "POST /a2a/agent/studySyncAgent",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`🚀 StudySync API running on: http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📡 A2A: http://localhost:${PORT}/a2a/agent/studySyncAgent`);
  console.log(`🔧 Ready for Telex JSON-RPC integration`);
});
