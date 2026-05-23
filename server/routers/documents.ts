// server/routers/documents.ts
// Teacher document management — upload, list, delete
// Protected procedures require admin role (teacher login)

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createDocument,
  deleteDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Teacher login required" });
  }
  return next({ ctx });
});

export const documentsRouter = router({
  // ─── Public: list all documents ──────────────────────────────────────────────
  list: publicProcedure
    .input(
      z.object({
        category: z.enum(["notes", "syllabus", "worksheet", "other", "all"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const docs = await getAllDocuments();
      if (!input?.category || input.category === "all") return docs;
      return docs.filter((d) => d.category === input.category);
    }),

  // ─── Public: get single document ─────────────────────────────────────────────
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const doc = await getDocumentById(input.id);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return doc;
    }),

  // ─── Admin: upload document (base64 encoded) ─────────────────────────────────
  upload: adminProcedure
    .input(
      z.object({
        titleZh: z.string().min(1).max(256),
        titleEn: z.string().min(1).max(256),
        category: z.enum(["notes", "syllabus", "worksheet", "other"]),
        descriptionZh: z.string().max(2000).optional(),
        descriptionEn: z.string().max(2000).optional(),
        filename: z.string().min(1).max(256),
        mimeType: z.string().min(1).max(128),
        fileSize: z.number().positive().max(20 * 1024 * 1024), // 20MB limit
        fileBase64: z.string(), // base64 encoded file content
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Decode base64 to buffer
      const buffer = Buffer.from(input.fileBase64, "base64");

      // Upload to S3 storage
      const fileKey = `teacher-docs/${nanoid()}-${input.filename}`;
      const { key, url } = await storagePut(fileKey, buffer, input.mimeType);

      // Save metadata to database
      await createDocument({
        titleZh: input.titleZh,
        titleEn: input.titleEn,
        category: input.category,
        filename: input.filename,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storageKey: key,
        storageUrl: url,
        descriptionZh: input.descriptionZh ?? null,
        descriptionEn: input.descriptionEn ?? null,
        uploadedBy: ctx.user.id,
      });

      return { success: true, url };
    }),

  // ─── Admin: update document metadata ─────────────────────────────────────────
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        titleZh: z.string().min(1).max(256).optional(),
        titleEn: z.string().min(1).max(256).optional(),
        category: z.enum(["notes", "syllabus", "worksheet", "other"]).optional(),
        descriptionZh: z.string().max(2000).optional(),
        descriptionEn: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDocument(id, data);
      return { success: true };
    }),

  // ─── Admin: delete document ───────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const doc = await getDocumentById(input.id);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteDocument(input.id);
      return { success: true };
    }),
});
