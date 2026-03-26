import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "prod";
const fallbackProdUrl = "https://ornabird.app";

function resolveUrl() {
  if (mode === "prod") {
    return fallbackProdUrl;
  }

  if (mode === "preview") {
    return process.env.ORNABIRD_PREVIEW_URL ?? process.argv[3];
  }

  if (mode === "custom") {
    return process.argv[3];
  }

  throw new Error(`Modo invalido: ${mode}. Use "prod", "preview" ou "custom".`);
}

const targetUrl = resolveUrl();

if (!targetUrl) {
  throw new Error(
    "URL nao informada. Para preview use ORNABIRD_PREVIEW_URL ou passe a URL como 3o argumento."
  );
}

if (!/^https?:\/\//i.test(targetUrl)) {
  throw new Error(`URL invalida: ${targetUrl}`);
}

const env = {
  ...process.env,
  ORNABIRD_MOBILE_URL: targetUrl
};

console.log(`[mobile] Sincronizando Android com ORNABIRD_MOBILE_URL=${targetUrl}`);

const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", "npx cap sync android"], {
        stdio: "inherit",
        env
      })
    : spawn("npx", ["cap", "sync", "android"], {
        stdio: "inherit",
        env
      });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
