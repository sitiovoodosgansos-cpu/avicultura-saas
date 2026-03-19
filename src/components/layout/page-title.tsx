type PageTitleProps = {
  title: string;
  description: string;
};

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <header className="mb-6 rounded-[28px] border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,245,255,0.92))] px-5 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-strong)]">
        Painel do Sitio
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--ink-soft)]">{description}</p>
    </header>
  );
}
