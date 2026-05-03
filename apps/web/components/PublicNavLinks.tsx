"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";

const LINKS: { href: string; labelKey: string }[] = [
  { href: "/", labelKey: "nav.home" },
  { href: "/services", labelKey: "nav.services" },
  { href: "/news", labelKey: "nav.news" },
  { href: "/contacts", labelKey: "nav.contacts" },
  { href: "/vacancies", labelKey: "nav.vacancies" }
];

function linkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname === "";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PublicNavLinks() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="nav-links" aria-label={t("nav.aria_main")}>
      {LINKS.map(({ href, labelKey }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link${linkActive(pathname, href) ? " is-active" : ""}`}
        >
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
