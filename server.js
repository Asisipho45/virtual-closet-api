import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db/pool.js";
import authRoutes from "./routes/auth.js";
import designerRoutes from "./routes/designers.js";
import clothingRoutes from "./routes/clothing.js";
import userRoutes from "./routes/users.js";
import aiRoutes from "./routes/ai.js";
import tryonRoutes from "./routes/tryon.js";
import outfitRoutes from "./routes/outfits.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "3mb" }));

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", dbTime: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/designers", designerRoutes);
app.use("/api/clothing", clothingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tryon", tryonRoutes);
app.use("/api/outfits", outfitRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});