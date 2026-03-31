import { cn } from '../../lib/utils.js';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, title, description, actions, className }: PageLayoutProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
          <div>
            {title && <h1 className="text-2xl font-bold">{title}</h1>}
            {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
}
