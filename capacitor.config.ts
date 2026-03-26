import type { CapacitorConfig } from "@capacitor/cli";

const defaultMobileUrl = "https://ornabird.app";
const mobileUrl = process.env.ORNABIRD_MOBILE_URL ?? defaultMobileUrl;

let mobileHost = "ornabird.app";
try {
  mobileHost = new URL(mobileUrl).host;
} catch {
  // Keep default host if an invalid URL is passed by mistake.
}

const config: CapacitorConfig = {
  appId: "com.ornabird.app",
  appName: "Ornabird",
  webDir: "public",
  server: {
    url: mobileUrl,
    cleartext: mobileUrl.startsWith("http://"),
    allowNavigation: [mobileHost],
    errorPath: "mobile-offline.html"
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      showSpinner: false,
      backgroundColor: "#0f172a",
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;
