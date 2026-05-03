"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";

function railNavActive(pathname: string, href: string) {
  if (href === "/cabinet" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type RailLayoutProps = {
  title?: string;
  subtitle?: string;
  nav: { href: string; label: string; badge?: string }[];
  children: React.ReactNode;
  contentClassName?: string;
  /** Merged onto the root `rail-layout` node (e.g. theme variant classes). */
  railClassName?: string;
  hideTopbar?: boolean;
};

export default function RailLayout({
  title,
  subtitle,
  nav,
  children,
  contentClassName,
  railClassName,
  hideTopbar
}: RailLayoutProps) {
  const pathname = usePathname() ?? "";
  const inCabinet = pathname.startsWith("/cabinet");
  const inAdmin = pathname.startsWith("/admin");
  const activeNavItem = nav.find((item) => railNavActive(pathname, item.href));
  const topbarContextLabel = activeNavItem?.label ?? subtitle ?? "";

  return (
    <div className={`rail-layout ${railClassName ?? ""}`.trim()}>
      <aside className="rail">
        {(title || subtitle) ? (
          <div className="stack rail-brand-block">
            {title ? <div className="h2 rail-brand-title">{title}</div> : null}
            {subtitle ? <div className="text-muted rail-brand-subtitle">{subtitle}</div> : null}
          </div>
        ) : null}
        <nav className="rail-nav">
          {nav.map((item) => (
            <Link
              key={item.href}
              className={`rail-link ${railNavActive(pathname, item.href) ? "is-active" : ""}`}
              href={item.href}
            >
              {item.label}
              {item.badge ? <span className="badge badge--muted">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="rail-main">
        {!hideTopbar ? (
          <div className="rail-topbar">
            <div className="rail-topbar-title">{topbarContextLabel}</div>
            <div className="nav-actions">
              <LanguageSelector />
              <Link className="button button--ghost" href="/">
                {t("nav.home")}
              </Link>
              {inCabinet ? (
                <Link className="button button--outline" href="/cabinet/profile">
                  {t("common.profile")}
                </Link>
              ) : null}
              {inAdmin ? (
                <Link className="button button--outline" href="/cabinet">
                  {t("nav.cabinet")}
                </Link>
              ) : null}
              {!inCabinet && !inAdmin ? (
                <Link className="button button--primary" href="/auth/login">
                  {t("nav.login")}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className={`rail-content ${contentClassName ?? ""}`.trim()}>{children}</div>
      </main>
    </div>
  );
}
