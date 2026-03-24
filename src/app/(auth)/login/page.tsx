import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const reset = resolvedSearchParams.reset;
  const resetDone = (Array.isArray(reset) ? reset[0] : reset) === "1";

  return <LoginForm resetDone={resetDone} />;
}