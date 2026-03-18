import { NextResponse } from "next/server";
import { timeoutSignal } from "@/lib/generate-id";

const DEV_FALLBACK_USER = {
  samAccountName: "jdoe",
  displayName: "John Doe",
  emailAddress: "john.doe@company.com",
  employeeId: "EMP001",
  givenName: "John",
  surname: "Doe",
  userName: "DOMAIN\\jdoe",
  department: "Development",
  location: "Local",
  role: "Developer",
};

// GET /api/userinfo — fetch user identity from AD/SSO or fall back to dev user
export async function GET() {
  const userInfoUrl = process.env.USER_INFO_URL;

  if (userInfoUrl) {
    try {
      const response = await fetch(userInfoUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: timeoutSignal(10_000),
      });

      if (!response.ok) {
        // In development, fall back to mock user so dashboard/admin work locally
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[userinfo] External SSO returned ${response.status}, using dev fallback`,
          );
          return NextResponse.json(DEV_FALLBACK_USER);
        }
        return NextResponse.json(
          { error: "Failed to fetch user info" },
          { status: response.status },
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch {
      // In development, fall back to mock user when SSO is unreachable
      if (process.env.NODE_ENV === "development") {
        console.warn("[userinfo] External SSO unreachable, using dev fallback");
        return NextResponse.json(DEV_FALLBACK_USER);
      }
      return NextResponse.json(
        { error: "User info service unavailable" },
        { status: 502 },
      );
    }
  }

  // No USER_INFO_URL configured — return dev fallback
  return NextResponse.json(DEV_FALLBACK_USER);
}
