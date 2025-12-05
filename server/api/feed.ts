import express from "express";
import { z } from "zod";
import { and, eq, desc, sql, ilike } from "drizzle-orm";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import {
  feedPosts,
  feedPostLikes,
  feedPostComments,
  users,
} from "@shared/schema";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";

const router = express.Router();
router.use(requireAuth);

// Validation schemas
const createPostSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
});

const updatePostSchema = createPostSchema.partial();

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentCommentId: z.number().int().optional(),
});

// ============ POSTS ENDPOINTS ============

// GET /api/feed/posts - List all posts with counts
router.get("/posts", async (req: any, res: any) => {
  try {
    const { search, pinned_only } = req.query;
    const conditions: any[] = [];

    if (search) {
      conditions.push(ilike(feedPosts.content, `%${search}%`));
    }

    if (pinned_only === "true") {
      conditions.push(eq(feedPosts.isPinned, true));
    }

    let query = db
      .select({
        id: feedPosts.id,
        content: feedPosts.content,
        attachments: feedPosts.attachments,
        isPinned: feedPosts.isPinned,
        createdAt: feedPosts.createdAt,
        updatedAt: feedPosts.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        authorId: feedPosts.authorId,
      })
      .from(feedPosts)
      .leftJoin(users, eq(feedPosts.authorId, users.id))
      .orderBy(desc(feedPosts.isPinned), desc(feedPosts.createdAt));

    if (conditions.length > 0) {
      query = (query as any).where(and(...conditions));
    }

    const posts = await query;

    // Get likes and comments counts for each post
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const [likesCount, commentsCount, userLike] = await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(feedPostLikes)
            .where(eq(feedPostLikes.postId, post.id))
            .then((r) => Number(r[0]?.count || 0)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(feedPostComments)
            .where(eq(feedPostComments.postId, post.id))
            .then((r) => Number(r[0]?.count || 0)),
          db
            .select()
            .from(feedPostLikes)
            .where(
              and(
                eq(feedPostLikes.postId, post.id),
                eq(feedPostLikes.userId, req.user.id)
              )
            )
            .limit(1),
        ]);

        return {
          ...post,
          likesCount,
          commentsCount,
          userHasLiked: userLike.length > 0,
        };
      })
    );

    res.json(postsWithCounts);
  } catch (error) {
    console.error("[Feed] Failed to fetch posts", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

// GET /api/feed/posts/:id - Get single post
router.get("/posts/:id", async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    if (Number.isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const [post] = await db
      .select({
        id: feedPosts.id,
        content: feedPosts.content,
        attachments: feedPosts.attachments,
        isPinned: feedPosts.isPinned,
        createdAt: feedPosts.createdAt,
        updatedAt: feedPosts.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        authorId: feedPosts.authorId,
      })
      .from(feedPosts)
      .leftJoin(users, eq(feedPosts.authorId, users.id))
      .where(eq(feedPosts.id, postId))
      .limit(1);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("[Feed] Failed to fetch post", error);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

// POST /api/feed/posts - Create new post
router.post("/posts", async (req: any, res: any) => {
  try {
    const data = createPostSchema.parse(req.body);

    const [post] = await db
      .insert(feedPosts)
      .values({
        ...data,
        authorId: req.user.id,
      })
      .returning();

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.FEED_POST_CREATE,
      RESOURCE_TYPES.FEED_POST,
      {
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      post.id,
      undefined,
      { content: post.content }
    );

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Feed] Failed to create post", error);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// PUT /api/feed/posts/:id - Update post
router.put("/posts/:id", async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    if (Number.isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const data = updatePostSchema.parse(req.body);

    // Check if post exists and user is author
    const [existingPost] = await db
      .select()
      .from(feedPosts)
      .where(eq(feedPosts.id, postId))
      .limit(1);

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (existingPost.authorId !== req.user.id && req.user.globalRole !== "global_administrator") {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }

    const [updatedPost] = await db
      .update(feedPosts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(feedPosts.id, postId))
      .returning();

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.FEED_POST_UPDATE,
      RESOURCE_TYPES.FEED_POST,
      {
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      postId,
      { content: existingPost.content },
      { content: updatedPost.content }
    );

    res.json(updatedPost);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Feed] Failed to update post", error);
    res.status(500).json({ message: "Failed to update post" });
  }
});

// DELETE /api/feed/posts/:id - Delete post
router.delete("/posts/:id", async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    if (Number.isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    // Check if post exists and user is author or admin
    const [existingPost] = await db
      .select()
      .from(feedPosts)
      .where(eq(feedPosts.id, postId))
      .limit(1);

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (existingPost.authorId !== req.user.id && req.user.globalRole !== "global_administrator") {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await db.delete(feedPosts).where(eq(feedPosts.id, postId));

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.FEED_POST_DELETE,
      RESOURCE_TYPES.FEED_POST,
      {
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      postId,
      { content: existingPost.content },
      undefined
    );

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("[Feed] Failed to delete post", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

// PUT /api/feed/posts/:id/pin - Toggle pin status (admin only)
router.put("/posts/:id/pin", async (req: any, res: any) => {
  try {
    if (req.user.globalRole !== "global_administrator") {
      return res.status(403).json({ message: "Only administrators can pin posts" });
    }

    const postId = parseInt(req.params.id);
    if (Number.isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const [existingPost] = await db
      .select()
      .from(feedPosts)
      .where(eq(feedPosts.id, postId))
      .limit(1);

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const [updatedPost] = await db
      .update(feedPosts)
      .set({
        isPinned: !existingPost.isPinned,
        updatedAt: new Date(),
      })
      .where(eq(feedPosts.id, postId))
      .returning();

    res.json(updatedPost);
  } catch (error) {
    console.error("[Feed] Failed to toggle pin", error);
    res.status(500).json({ message: "Failed to toggle pin" });
  }
});

// ============ LIKES ENDPOINTS ============

// POST /api/feed/posts/:id/like - Toggle like
router.post("/posts/:id/like", async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    if (Number.isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    // Check if post exists
    const [post] = await db
      .select()
      .from(feedPosts)
      .where(eq(feedPosts.id, postId))
      .limit(1);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if already liked
    const [existingLike] = await db
      .select()
      .from(feedPostLikes)
      .where(
        and(
          eq(feedPostLikes.postId, postId),
          eq(feedPostLikes.userId, req.user.id)
        )
      )
      .limit(1);

    if (existingLike) {
      // Unlike
      await db
        .delete(feedPostLikes)
        .where(eq(feedPostLikes.id, existingLike.id));
      res.json({ liked: false, message: "Post unliked" });
    } else {
      // Like
      await db.insert(feedPostLikes).values({
        postId,
        userId: req.user.id,
      });
      res.json({ liked: true, message: "Post liked" });
    }
  } catch (error) {
    console.error("[Feed] Failed to toggle like", error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
});

// ============ COMMENTS ENDPOINTS ============

// GET /api/feed/posts/:id/comments - Get comments for a post
router.get("/posts/:id/comments", async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    if (Number.isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const comments = await db
      .select({
        id: feedPostComments.id,
        content: feedPostComments.content,
        parentCommentId: feedPostComments.parentCommentId,
        createdAt: feedPostComments.createdAt,
        updatedAt: feedPostComments.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        authorId: feedPostComments.authorId,
      })
      .from(feedPostComments)
      .leftJoin(users, eq(feedPostComments.authorId, users.id))
      .where(eq(feedPostComments.postId, postId))
      .orderBy(feedPostComments.createdAt);

    res.json(comments);
  } catch (error) {
    console.error("[Feed] Failed to fetch comments", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// POST /api/feed/posts/:id/comments - Add comment to post
router.post("/posts/:id/comments", async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    if (Number.isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const data = createCommentSchema.parse(req.body);

    // Check if post exists
    const [post] = await db
      .select()
      .from(feedPosts)
      .where(eq(feedPosts.id, postId))
      .limit(1);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // If replying to a comment, check it exists
    if (data.parentCommentId) {
      const [parentComment] = await db
        .select()
        .from(feedPostComments)
        .where(eq(feedPostComments.id, data.parentCommentId))
        .limit(1);

      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
    }

    const [comment] = await db
      .insert(feedPostComments)
      .values({
        postId,
        authorId: req.user.id,
        content: data.content,
        parentCommentId: data.parentCommentId || null,
      })
      .returning();

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Feed] Failed to create comment", error);
    res.status(500).json({ message: "Failed to create comment" });
  }
});

// PUT /api/feed/comments/:id - Update comment
router.put("/comments/:id", async (req: any, res: any) => {
  try {
    const commentId = parseInt(req.params.id);
    if (Number.isNaN(commentId)) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    const { content } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Check if comment exists and user is author
    const [existingComment] = await db
      .select()
      .from(feedPostComments)
      .where(eq(feedPostComments.id, commentId))
      .limit(1);

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (existingComment.authorId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this comment" });
    }

    const [updatedComment] = await db
      .update(feedPostComments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(feedPostComments.id, commentId))
      .returning();

    res.json(updatedComment);
  } catch (error) {
    console.error("[Feed] Failed to update comment", error);
    res.status(500).json({ message: "Failed to update comment" });
  }
});

// DELETE /api/feed/comments/:id - Delete comment
router.delete("/comments/:id", async (req: any, res: any) => {
  try {
    const commentId = parseInt(req.params.id);
    if (Number.isNaN(commentId)) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    // Check if comment exists and user is author or admin
    const [existingComment] = await db
      .select()
      .from(feedPostComments)
      .where(eq(feedPostComments.id, commentId))
      .limit(1);

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (existingComment.authorId !== req.user.id && req.user.globalRole !== "global_administrator") {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    await db.delete(feedPostComments).where(eq(feedPostComments.id, commentId));

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("[Feed] Failed to delete comment", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});

export default router;


