interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-border">
      <div className="min-w-0">
        <h1 className="text-sm sm:text-lg text-foreground glow-text tracking-widest truncate">{title}</h1>
        {description && <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 tracking-wider truncate">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">{children}</div>}
    </div>
  );
}
