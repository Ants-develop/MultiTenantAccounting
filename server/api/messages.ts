import { Router } from "express";
import { db } from "../db";
import { messages, conversations, conversationParticipants, profiles } from "@shared/schema";
import { eq, and, ne } from "drizzle-orm";
import { createNotification } from "../services/notification";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Use Supabase Auth middleware
router.use(requireAuth);

// Send a message
router.post("/", async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user?.id as string;

    if (!conversationId || !content) {
      return res.status(400).json({ message: "Conversation ID and content are required" });
    }

    // Verify user is participant
    const [participant] = await db.select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, senderId)
      ))
      .limit(1);

    if (!participant) {
      return res.status(403).json({ message: "You are not a participant in this conversation" });
    }

    // Create message
    const [newMessage] = await db.insert(messages).values({
      conversationId,
      senderId,
      content,
      type: "text"
    }).returning();

    // Update conversation last message
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

    // Get sender details for notification
    const [sender] = await db.select()
      .from(profiles)
      .where(eq(profiles.id, senderId))
      .limit(1);

    // Notify other participants
    const otherParticipants = await db.select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        ne(conversationParticipants.userId, senderId)
      ));

    for (const p of otherParticipants) {
      await createNotification(
        p.userId,
        "message",
        "New Message",
        `You have a new message from ${sender?.firstName || 'User'} ${sender?.lastName || ''}`,
        `/messages/${conversationId}`
      );
    }

    res.status(201).json(newMessage);
  } catch (error: any) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

export default router;
