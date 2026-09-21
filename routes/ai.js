import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth, requireUserType } from "../middleware/auth.js";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// POST /api/ai/detect-clothing
router.post("/detect-clothing", requireAuth, requireUserType("user"), async (req, res) => {
  const { imagePath } = req.body;

  const parsed = parseDataUrl(imagePath);
  if (!parsed) {
    return res.status(400).json({ error: "A valid image is required." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Look at this photo of a single clothing item. Respond with ONLY a JSON object, no other text, in this exact shape:
{"color": "<one or two word primary color, e.g. Charcoal, Navy Blue>", "category": "<one or two word garment type, e.g. Blazer, T-Shirt, Jeans>"}
If you cannot confidently identify a clothing item in the photo, respond with {"color": "", "category": ""}.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
    ]);

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: "Couldn't understand the AI's response." });
    }

    const parsedResult = JSON.parse(jsonMatch[0]);
    res.json({
      color: parsedResult.color || "",
      category: parsedResult.category || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI detection failed. Please fill in the details manually." });
  }
});

export default router;