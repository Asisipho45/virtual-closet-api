import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireUserType } from "../middleware/auth.js";

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

// GET /api/users/me  (your own full profile, including avatar)
router.get("/me", requireAuth, requireUserType("user"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, avatar_path FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    const row = result.rows[0];
    res.json({ id: row.id, username: row.username, email: row.email, avatarPath: row.avatar_path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't fetch your profile." });
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

// PATCH /api/users/me/avatar  (save/replace your photo)
router.patch("/me/avatar", requireAuth, requireUserType("user"), async (req, res) => {
  const { avatarPath } = req.body;

  if (!avatarPath || !avatarPath.startsWith("data:image/")) {
    return res.status(400).json({ error: "A valid photo is required." });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET avatar_path = $1 WHERE id = $2 RETURNING id, username, email, avatar_path",
      [avatarPath, req.user.id]
    );
    const row = result.rows[0];
    res.json({ id: row.id, username: row.username, email: row.email, avatarPath: row.avatar_path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't save your photo." });
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