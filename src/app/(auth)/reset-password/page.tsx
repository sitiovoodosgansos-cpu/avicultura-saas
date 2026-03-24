import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const token = resolvedSearchParams.token;
  const rawToken = Array.isArray(token) ? token[0] : token;

  return <ResetPasswordForm token={rawToken} />;
}