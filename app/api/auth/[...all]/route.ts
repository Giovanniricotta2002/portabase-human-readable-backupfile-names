import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import * as drizzleDb from "@/db";
import { eq } from "drizzle-orm";
import { computeSystemPermissions } from "@/lib/acl/system-acl";
import { User } from "@/db/schema/02_user";

const authHandler = toNextJsHandler(auth.handler);

async function blockApiKeyCreateForRestrictedUsers(
  req: NextRequest,
): Promise<NextResponse | null> {
  const url = req.nextUrl;
  if (req.method !== "POST" || !url.pathname.endsWith("/api-key/create")) {
    return null;
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }
  // @ts-ignore
  if (session.user.banned || (session.user.role as string) === "pending") {
    return NextResponse.json(
      { error: "Account not eligible to create API keys" },
      { status: 403 },
    );
  }
  return null;
}

const SUPERADMIN_ROLE = "superadmin";

const ROLE_ASSIGN_PATHS = ["/admin/set-role", "/admin/update-user", "/admin/create-user"];

const TARGET_GUARD_PATHS = [
  "/admin/set-role",
  "/admin/update-user",
  "/admin/remove-user",
  "/admin/ban-user",
  "/admin/set-user-password",
];

const roleContainsSuperadmin = (role: unknown): boolean => {
  const roles = Array.isArray(role)
    ? role
    : typeof role === "string"
      ? role.split(",")
      : [];
  return roles.some(
    (r) => (typeof r === "string" ? r.trim() : r) === SUPERADMIN_ROLE,
  );
};

const forbidden = () =>
  NextResponse.json(
    { message: "You are not allowed to perform this action", code: "FORBIDDEN" },
    { status: 403 },
  );

async function enforceRoleHierarchy(
  req: NextRequest,
): Promise<NextResponse | null> {
  if (req.method !== "POST") return null;
  const pathname = req.nextUrl.pathname;
  const isRoleAssign = ROLE_ASSIGN_PATHS.some((p) => pathname.endsWith(p));
  const isTargetGuard = TARGET_GUARD_PATHS.some((p) => pathname.endsWith(p));
  if (!isRoleAssign && !isTargetGuard) return null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const permissions = computeSystemPermissions(session.user as User);
  if (permissions.isSuperAdmin) return null;

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch {
    return null;
  }

  if (isRoleAssign) {
    const requestedRole = body?.role ?? body?.data?.role;
    if (roleContainsSuperadmin(requestedRole)) return forbidden();
  }

  if (isTargetGuard) {
    const userId = body?.userId;
    if (typeof userId !== "string" || userId.length === 0) {
      return forbidden();
    }
    try {
      const target = await db.query.user.findFirst({
        where: eq(drizzleDb.schemas.user.id, userId),
      });
      if (roleContainsSuperadmin(target?.role)) return forbidden();
    } catch {
      return forbidden();
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  return authHandler.GET(req);
}

export async function POST(req: NextRequest) {
  const apiKeyGuard = await blockApiKeyCreateForRestrictedUsers(req);
  if (apiKeyGuard) return apiKeyGuard;
  const roleGuard = await enforceRoleHierarchy(req);
  if (roleGuard) return roleGuard;
  return authHandler.POST(req);
}
