import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "../db/pool.js";
import { requireAuth, requireUserType } from "../middleware/auth.js";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// POST /api/tryon
router.post("/", requireAuth, requireUserType("user"), async (req, res) => {
  const { clothingItemIds } = req.body;

  if (!Array.isArray(clothingItemIds) || clothingItemIds.length === 0) {
    return res.status(400).json({ error: "clothingItemIds must be a non-empty array." });
  }

  try {
    const userResult = await pool.query("SELECT avatar_path FROM users WHERE id = $1", [
      req.user.id,
    ]);
    const avatarPath = userResult.rows[0]?.avatar_path;

    if (!avatarPath) {
      return res
        .status(400)
        .json({ error: "Please upload a photo of yourself on the Avatar page first." });
    }

    const itemsResult = await pool.query(
      "SELECT id, image_path, color, category FROM clothing_items WHERE id = ANY($1) AND user_id = $2",
      [clothingItemIds, req.user.id]
    );
    const garmentItems = itemsResult.rows.filter((r) => r.image_path);

    if (garmentItems.length === 0) {
      return res.status(404).json({ error: "None of those items could be found with a photo." });
    }

    const avatar = parseDataUrl(avatarPath);
    if (!avatar) {
      return res.status(400).json({ error: "Couldn't read your avatar photo." });
    }

    const garments = garmentItems
      .map((item) => ({ ...item, parsed: parseDataUrl(item.image_path) }))
      .filter((item) => item.parsed);

    const garmentDescriptions = garments
      .map((g, i) => `Image ${i + 2}: a ${g.color} ${g.category}`)
      .join(". ");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    const prompt = `You are given ${garments.length + 1} images. Image 1 is a photo of a person. ${garmentDescriptions}. Generate a new, photorealistic image of the SAME person from image 1, now wearing the full outfit made up of all the clothing items shown in the other images together. Preserve the person's face, body shape, pose, and the background exactly as in image 1. Only the clothing should change, combining all the given garments into one coherent, naturally-fitted outfit on their body.`;

    const parts = [
      prompt,
      { inlineData: { mimeType: avatar.mimeType, data: avatar.data } },
      ...garments.map((g) => ({
        inlineData: { mimeType: g.parsed.mimeType, data: g.parsed.data },
      })),
    ];

    const result = await model.generateContent(parts);

    const responseParts = result.response.candidates?.[0]?.content?.parts || [];
    const imagePart = responseParts.find((p) => p.inlineData);

    if (!imagePart) {
      console.error("No image returned. Full response:", JSON.stringify(result.response, null, 2));
      return res.status(502).json({ error: "The AI didn't return an image. Please try again." });
    }

    const generatedImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    res.json({ image: generatedImage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Try-on generation failed. Please try again." });
  }
});

export default router;