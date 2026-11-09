import type { ReactNode } from 'react';

export function PageHeading({ title, description, icon, actions, eyebrow = 'Your learning space' }: {
  title: string; description: ReactNode; icon: ReactNode; actions?: ReactNode; eyebrow?: string;
}) {
  return <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
    <div className="flex min-w-0 items-start gap-3">
      <span aria-hidden="true" className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <div className="min-w-0"><p className="mb-1 text-[11px] font-medium tracking-wide text-primary">{eyebrow}</p><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><div className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</div></div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}
