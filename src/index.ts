import express from "express";
import type { Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { initializeDatabase, pool } from "./db.ts";
import { Octokit } from "octokit";

const app = express();
const PORT = process.env.PORT || 3000;
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "GitHub Profile Analyzer API",
    endpoints: {
      "POST /analyze/:username": "Fetch from GitHub, store/refresh analysis",
      "GET  /profiles": "List every analyzed profile",
      "GET  /profiles/:username": "Retrieve a single stored profile",
      "DELETE /profiles/:username": "Remove a stored profile",
    },
  });
});

// ─── Analyze & store ─────────────────────────────────────────────────────────

app.post("/analyze/:username", async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const { data: user } = await octokit.request("GET /users/{username}", {
      username: username,
      headers: {
        "X-GitHub-Api-Version": "2026-03-10",
      },
    });

    await pool.query(
      `INSERT INTO github_profiles
         (username, name, bio, public_repos, followers, following)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name         = VALUES(name),
         bio          = VALUES(bio),
         public_repos = VALUES(public_repos),
         followers    = VALUES(followers),
         following    = VALUES(following)`,
      [
        user.login,
        user.name ?? null,
        user.bio ?? null,
        user.public_repos,
        user.followers,
        user.following,
      ],
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM github_profiles WHERE username = ?",
      [user.login],
    );

    res.status(200).json({
      message: "Profile analyzed and stored successfully",
      profile: rows[0],
    });
  } catch (error: any) {
    if (error.status === 404) {
      return res
        .status(404)
        .json({ error: `GitHub user '${username}' not found` });
    }
    console.error("Error analyzing profile:", error.message);
    res.status(500).json({ error: "Failed to analyze profile" });
  }
});

// ─── List all profiles ────────────────────────────────────────────────────────

app.get("/profiles", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM github_profiles",
    );
    res.json({ count: rows.length, profiles: rows });
  } catch (error: any) {
    console.error("Error fetching profiles:", error.message);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

// ─── Single profile ───────────────────────────────────────────────────────────

app.get("/profiles/:username", async (req: Request, res: Response) => {
  const { username } = req.params;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM github_profiles WHERE username = ?",
      [username],
    );
    if (!rows.length) {
      return res.status(404).json({
        error: `Profile '${username}' not found. Run POST /analyze/${username} first.`,
      });
    }
    res.json({ profile: rows[0] });
  } catch (error: any) {
    console.error("Error fetching profile:", error.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ─── Delete profile ───────────────────────────────────────────────────────────

app.delete("/profiles/:username", async (req: Request, res: Response) => {
  const { username } = req.params;
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM github_profiles WHERE username = ?",
      [username],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Profile '${username}' not found` });
    }
    res.json({ message: `Profile '${username}' deleted successfully` });
  } catch (error: any) {
    console.error("Error deleting profile:", error.message);
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

async function start() {
  await initializeDatabase();
  console.log("Database initialized successfully");
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
