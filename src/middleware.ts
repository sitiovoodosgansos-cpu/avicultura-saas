import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/plantel/:path*",
    "/coleta-ovos/:path*",
    "/chocadeiras/:path*",
    "/sanidade/:path*",
    "/financeiro/:path*",
    "/relatorios/:path*",
    "/perfil/:path*"
  ]
};
