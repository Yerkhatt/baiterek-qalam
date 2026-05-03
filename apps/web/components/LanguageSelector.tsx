import { t } from "@/lib/i18n";

export default function LanguageSelector() {
  return (
    <details className="language-selector">
      <summary>{t("language.label")}</summary>
      <div className="language-menu">
        <button className="language-option" type="button">
          {t("language.ru")}
        </button>
        <button className="language-option" type="button" disabled>
          {t("language.kk")}
          <span className="badge badge--muted">{t("language.comingSoon")}</span>
        </button>
        <button className="language-option" type="button" disabled>
          {t("language.en")}
          <span className="badge badge--muted">{t("language.comingSoon")}</span>
        </button>
      </div>
    </details>
  );
}
