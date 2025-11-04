// src/server-test.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4112; // Different port for testing

app.use(cors());
app.use(express.json());

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log('=== 📥 INCOMING REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('============================');
  next();
});

app.post("/a2a/agent/studySyncAgent", async (req, res) => {
  console.log("🎯 PROCESSING TELEX REQUEST");
  
  try {
    const { sender, content } = req.body;
    
    console.log("🔍 Raw content:", content);
    
    // Extract text from Telex format
    let messageText = "";
    if (content && Array.isArray(content)) {
      const textParts = content.filter(part => part.kind === 'text');
      console.log("📝 Text parts found:", textParts.length);
      
      if (textParts.length > 0) {
        messageText = textParts[textParts.length - 1].text || "";
        messageText = messageText.replace(/<[^>]*>/g, '').trim();
        console.log("🧹 Cleaned message:", messageText);
      }
    }
    
    const userName = sender?.name || "there";
    const userId = sender?.id || `user-${Date.now()}`;

    console.log(`👤 Final - User: ${userName}, Message: "${messageText}"`);

    // Handle empty message
    if (!messageText || messageText.trim().length === 0) {
      console.log("🆕 Sending welcome message");
      return res.json({
        status: "success",
        reply: {
          type: "message",
          text: `👋 Hello ${userName}! I'm StudySync! What would you like to learn? 📚`
        }
      });
    }

    console.log("🤖 Generating agent response...");
    
    // Simple response for testing
    const response = `Hey ${userName}! I understand you want to study: "${messageText}". I'm StudySync, ready to help! What specific topic are you focusing on?`;
    
    console.log("✅ Sending response:", response);
    
    return res.json({
      status: "success",
      reply: {
        type: "message", 
        text: response
      }
    });
    
  } catch (error: any) {
    console.error("❌ Error:", error);
    return res.json({
      status: "success",
      reply: {
        type: "message", 
        text: "Hey! I'm StudySync, ready to help! What would you like to study? 📚"
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`🧪 TEST SERVER running on: http://localhost:${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/a2a/agent/studySyncAgent`);
});