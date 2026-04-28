import type { ReactNode } from "react";
import { Search } from "lucide-react";

export type PageHeaderSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  search?: PageHeaderSearch | null;
  avatarLabels?: string[];
  children?: ReactNode;
};

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  const one = parts[0] ?? "?";
  return one.length >= 2 ? one.slice(0, 2).toUpperCase() : one.toUpperCase();
}

export function PageHeader({ title, subtitle, search, avatarLabels, children }: Props) {
  const stack = avatarLabels?.slice(0, 4) ?? [];
  const extra = avatarLabels && avatarLabels.length > 4 ? avatarLabels.length - 4 : 0;

  return (
    <header className="page-header">
      <div className="page-header-titles">
        <h1>{title}</h1>
        {subtitle ? <p className="page-header-sub">{subtitle}</p> : null}
      </div>
      {search ? (
        <div className="page-header-search-wrap">
          <div className="page-header-search">
            <input
              type="search"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search…"}
              aria-label="Search"
            />
            <span className="page-header-search-icon">
              <Search size={18} strokeWidth={2} aria-hidden />
            </span>
          </div>
        </div>
      ) : null}
      <div className="page-header-aside">
        {stack.length > 0 ? (
          <div className="avatar-stack" aria-hidden>
            {stack.map((label) => (
              <span key={label} className="avatar-initials" title={label}>
                {initialsFromLabel(label)}
              </span>
            ))}
            {extra > 0 ? <span className="avatar-stack-more">+{extra}</span> : null}
          </div>
        ) : null}
        {children}
      </div>
    </header>
  );
}
