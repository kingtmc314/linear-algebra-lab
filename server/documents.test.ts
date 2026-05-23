import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "teacher@example.com",
    name: "Teacher",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "student@example.com",
    name: "Student",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("documents.list", () => {
  it("allows public access to list documents", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw for public procedure
    // (DB may not be available in test env, so we just check it doesn't throw auth error)
    try {
      const result = await caller.documents.list({ category: "all" });
      expect(Array.isArray(result)).toBe(true);
    } catch (err: any) {
      // DB not available in test env is acceptable
      expect(err.message).not.toContain("UNAUTHORIZED");
      expect(err.message).not.toContain("FORBIDDEN");
    }
  });
});

describe("documents.upload", () => {
  it("rejects upload from unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.documents.upload({
        titleZh: "Test",
        titleEn: "Test",
        category: "notes",
        filename: "test.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        fileBase64: "dGVzdA==",
      })
    ).rejects.toThrow();
  });

  it("rejects upload from regular user (non-admin)", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.documents.upload({
        titleZh: "Test",
        titleEn: "Test",
        category: "notes",
        filename: "test.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        fileBase64: "dGVzdA==",
      })
    ).rejects.toThrow(/FORBIDDEN|Teacher login required/);
  });
});

describe("documents.delete", () => {
  it("rejects delete from unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.documents.delete({ id: 1 })).rejects.toThrow();
  });

  it("rejects delete from regular user (non-admin)", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.documents.delete({ id: 1 })).rejects.toThrow(/FORBIDDEN|Teacher login required/);
  });
});
