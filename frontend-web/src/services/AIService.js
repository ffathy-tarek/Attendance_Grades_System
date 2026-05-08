// src/services/AIService.js
import OpenAI from "openai";

class AIService {
  constructor() {
    this.client = null;
    this.isEnabled = false;
    this.init();
  }

  init() {
    const apiKey =
      import.meta.env.GROQ_API_KEY || import.meta.env.VITE_GROQ_API_KEY;

    if (apiKey && apiKey !== "" && apiKey !== "YOUR_GROQ_API_KEY_HERE") {
      try {
        this.client = new OpenAI({
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: apiKey,
          dangerouslyAllowBrowser: true,
        });
        this.isEnabled = true;
        console.log("✅ Groq AI initialized successfully!");
        console.log("🎉 You can now ask ANY question!");
      } catch (error) {
        console.error("❌ Failed to initialize Groq:", error);
        this.isEnabled = false;
      }
    } else {
      console.log("⚠️ No Groq API key found, using local mode only");
      this.isEnabled = false;
    }
  }

  isAvailable() {
    return this.isEnabled && this.client !== null;
  }

  async ask(prompt, studentContext) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const systemPrompt = `You are a friendly, helpful AI assistant for a university student. 

Here is the student's personal data:
- Name: ${studentContext.profile?.name || "Unknown"}
- Student ID: ${studentContext.profile?.studentId || "N/A"}
- Department: ${studentContext.profile?.department || "Unknown"}
- Academic Level: ${studentContext.profile?.academicYear || "Unknown"}

Here are the student's courses with attendance:
${
  studentContext.attendance
    ?.map(
      (c) =>
        `- ${c.subject}: Attended ${c.present}/${c.total} lectures (${c.absencePercent}% absences) - Status: ${c.status}`,
    )
    .join("\n") || "No courses enrolled"
}

Here are the student's grades:
${
  studentContext.grades
    ?.map((g) => `- ${g.subject}: ${g.total}% (${g.status})`)
    .join("\n") || "No grades available yet"
}

Instructions:
1. Respond in the SAME language as the user's question (Arabic or English)
2. Be friendly, concise, and helpful
3. If the question is about the student (attendance, grades, personal info), use the data above
4. If the question is general (like "how to learn Java", "explain recursion", "tell me a joke"), answer normally
5. Use emojis to make responses engaging
6. Keep responses under 500 words

User question: ${prompt}`;

      const completion = await this.client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Groq API Error:", error);
      return null;
    }
  }
}

export default new AIService();
