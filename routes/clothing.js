import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireUserType } from "../middleware/auth.js";

const router = Router();

// GET /api/clothing
router.get("/", requireAuth, requireUserType("user"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, color, category, image_path FROM clothing_items WHERE user_id = $1 ORDER BY id",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't fetch clothing items." });
  }
});

// POST /api/clothing
router.post("/", requireAuth, requireUserType("user"), async (req, res) => {
  const { color, category, imagePath } = req.body;

  if (!color || !category) {
    return res.status(400).json({ error: "Color and category are required." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO clothing_items (user_id, color, category, image_path) VALUES ($1, $2, $3, $4) RETURNING id, color, category, image_path",
      [req.user.id, color, category, imagePath || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't save that clothing item." });
  }
});

// DELETE /api/clothing/:id
router.delete("/:id", requireAuth, requireUserType("user"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM clothing_items WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found." });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete that item." });
  }
});

export default router;