import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { AppNav } from "@/components/layout/app-nav";

export default async function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen md:flex">
      <AppNav />
      <div className="flex-1 pb-20 md:pb-0">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Conta ativa</p>
            <h1 className="text-sm font-semibold text-zinc-800">{session.user.name}</h1>
          </div>
          <Link
            href="/api/auth/signout"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Sair
          </Link>
        </header>
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}

