import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/users  (list all — used by the admin page)
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, email FROM users ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't fetch users." });
  }
});

// PATCH /api/users/me  (update your own username)
router.patch("/me", requireAuth, async (req, res) => {
  const { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: "Username cannot be empty." });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email",
      [username.trim(), req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update username." });
  }
});

// DELETE /api/users/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete user." });
  }
});

export default router;