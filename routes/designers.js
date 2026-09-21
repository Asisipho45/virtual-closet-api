import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { requireAuth, requireUserType } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { isValidEmail, isValidPassword } from "../utils/validate.js";

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/designers/register
router.post("/register", authLimiter, async (req, res) => {
  const { name, email, password, uniqueId } = req.body;

  if (!name || !email || !password || !uniqueId) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM designers WHERE email = $1 OR unique_id = $2",
      [email, uniqueId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "That email or designer ID is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      "INSERT INTO designers (name, email, password_hash, unique_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, unique_id",
      [name, email, passwordHash, uniqueId]
    );

    const designer = result.rows[0];
    const token = jwt.sign(
      { id: designer.id, email: designer.email, type: "designer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: designer.id,
        username: designer.name,
        email: designer.email,
        uniqueId: designer.unique_id,
        type: "designer",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong registering that designer." });
  }
});

// GET /api/designers  (list all — used by the admin page)
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, unique_id FROM designers ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't fetch designers." });
  }
});

// DELETE /api/designers/:id  (designer-only action)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM designers WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete designer." });
  }
});

// PATCH /api/designers/:id  (designer-only action)
router.patch("/:id", requireAuth, async (req, res) => {
  const { name, email, uniqueId } = req.body;
  try {
    const result = await pool.query(
      "UPDATE designers SET name = $1, email = $2, unique_id = $3 WHERE id = $4 RETURNING id, name, email, unique_id",
      [name, email, uniqueId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Designer not found." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update designer." });
  }
});

export default router;