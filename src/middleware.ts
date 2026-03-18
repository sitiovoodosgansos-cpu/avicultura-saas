export { default } from "next-auth/middleware";

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

