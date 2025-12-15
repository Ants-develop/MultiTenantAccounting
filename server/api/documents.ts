import express from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { documents, insertDocumentSchema } from "@shared/schema";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

router.use(requireAuth);

// Get all documents for a client
router.get("/", async (req, res) => {
  try {
    // Assuming clientId is passed in query or header, or we fetch all for now
    // In a real app, we'd filter by the user's active client context
    const allDocuments = await db.select().from(documents);
    res.json(allDocuments);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

// Create a document
router.post("/", async (req, res) => {
  try {
    const data = insertDocumentSchema.parse(req.body);
    const [newDocument] = await db.insert(documents).values(data).returning();
    res.status(201).json(newDocument);
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ message: "Failed to create document" });
  }
});

export default router;
