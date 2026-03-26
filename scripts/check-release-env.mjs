const requiredEnv = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_MONTHLY",
  "STRIPE_PRICE_ID_YEARLY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "PASSWORD_RESET_URL"
];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("Faltam variaveis obrigatorias para release:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("Variaveis obrigatorias OK para release.");

