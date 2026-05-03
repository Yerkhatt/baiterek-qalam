import { t } from "@/lib/i18n";

export function getAdminNav() {
  return [
    { href: "/admin", label: t("admin.nav_overview") },
    { href: "/admin/services", label: t("admin.nav_services") },
    { href: "/admin/constructor", label: t("admin.nav_workflows") },
    { href: "/admin/content", label: t("admin.nav_content") },
    { href: "/admin/applications", label: t("admin.nav_applications") },
    { href: "/admin/users", label: t("admin.nav_users") },
    { href: "/admin/analytics", label: t("admin.nav_analytics") },
    { href: "/admin/dictionaries", label: t("admin.nav_dictionaries") },
    { href: "/admin/settings", label: t("admin.nav_settings") }
  ];
}
