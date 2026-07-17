import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  const body = await response.json();
  const nextResponse = NextResponse.json(
    response.ok ? { user: body.user, accessToken: body.accessToken } : body,
    { status: response.status },
  );

  if (response.ok && body.accessToken && body.refreshToken) {
    nextResponse.cookies.set("auth_token", body.accessToken, {
      path: "/",
      maxAge: THIRTY_DAYS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    nextResponse.cookies.set("refresh_token", body.refreshToken, {
      httpOnly: true,
      path: "/",
      maxAge: THIRTY_DAYS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    nextResponse.cookies.delete("auth_token");
    nextResponse.cookies.delete("refresh_token");
  }

  return nextResponse;
}
