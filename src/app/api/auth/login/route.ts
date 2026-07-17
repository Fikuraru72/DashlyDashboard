import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function POST(request: Request) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
    cache: "no-store",
  });
  const body = await response.json();
  const refreshToken = body.refreshToken;
  if (response.ok) delete body.refreshToken;
  const nextResponse = NextResponse.json(body, { status: response.status });

  if (response.ok && body.accessToken && refreshToken) {
    nextResponse.cookies.set("auth_token", body.accessToken, {
      path: "/",
      maxAge: THIRTY_DAYS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    nextResponse.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      path: "/",
      maxAge: THIRTY_DAYS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return nextResponse;
}
