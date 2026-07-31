import { auth } from "@/lib/auth";

const PROTECTED_PATH_PREFIXES = ["/dashboard", "/booking"];

export default auth((request) => {
  const isLoggedIn = Boolean(request.auth);
  const isProtected = PROTECTED_PATH_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/booking/:path*"],
};
