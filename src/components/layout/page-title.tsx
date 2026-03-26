import { IconBadge } from "@/components/ui/icon-badge";

type PageTitleProps = {
  title: string;
  description: string;
  icon?: string;
};

export function PageTitle({ title, description, icon = "\u{2728}" }: PageTitleProps) {
  return (
    <header className="mb-5 rounded-xl border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,245,255,0.92))] px-4 py-4 shadow-[0_14px_35px_rgba(15,23,42,0.06)] sm:mb-6 sm:rounded-[28px] sm:px-5 sm:py-5 sm:shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-strong)]">
        Painel do Sitio
      </p>
      <div className="mt-2 flex items-start gap-3">
        <IconBadge emoji={icon} tone="sky" className="size-9 rounded-lg text-base sm:size-11 sm:rounded-2xl sm:text-lg" />
        <div className="min-w-0">
          <h1 className="text-[1.85rem] font-semibold leading-tight text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-[color:var(--ink-soft)] sm:mt-2 sm:text-sm">{description}</p>
        </div>
      </div>
    </header>
  );
}
