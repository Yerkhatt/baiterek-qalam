"use client";

interface Props {
  serviceId: string;
  hasChanges: boolean;
  canPublish: boolean;
  metadataReady: boolean;
  canUndo: boolean;
  canRedo: boolean;
  status: string | null;
  graphWarningCount: number;
  authoringIssueCount: number;
  onServiceIdChange: (id: string) => void;
  onLoad: () => void;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onOpenMetadata: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onBack: () => void;
}

export function ConstructorToolbar({
  serviceId,
  hasChanges,
  canPublish,
  metadataReady,
  canUndo,
  canRedo,
  status,
  graphWarningCount,
  authoringIssueCount,
  onServiceIdChange,
  onLoad,
  onSave,
  onPublish,
  onPreview,
  onOpenMetadata,
  onUndo,
  onRedo,
  onBack
}: Props) {
  return (
    <header className="ctb">
      <button type="button" className="ctb-back" onClick={onBack} aria-label="Назад">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="ctb-brand">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect width="20" height="20" rx="5" fill="#1db954" />
          <path d="M5 10l3 3 7-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="ctb-brand-name">Конструктор</span>
      </div>

      <input
        className="ctb-name"
        value={serviceId}
        placeholder="Название услуги"
        onChange={(e) => onServiceIdChange(e.target.value)}
        onBlur={onLoad}
        onKeyDown={(e) => { if (e.key === "Enter") onLoad(); }}
        aria-label="Название услуги"
      />

      {status && (
        <div
          className={[
            "ctb-status",
            status.startsWith("Ошибка") ||
            status.startsWith("Сохранение не удалось") ||
            status.startsWith("Публикация заблокирована")
              ? "ctb-status--error"
              : ""
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status}
        </div>
      )}

      <div className="ctb-spacer" />

      <div className="ctb-history">
        <button
          type="button"
          className="ctb-icon-btn"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Отменить"
          title="Отменить (Ctrl+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 6h6a4 4 0 010 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M5 3L2 6l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          className="ctb-icon-btn"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Повторить"
          title="Повторить (Ctrl+Shift+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M12 6H6a4 4 0 000 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M9 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="ctb-actions">
        {graphWarningCount > 0 ? (
          <span className="ctb-warn-chip" title={`Предупреждений графа: ${graphWarningCount}`}>
            Граф: {graphWarningCount}
          </span>
        ) : null}
        {authoringIssueCount > 0 ? (
          <span className="ctb-warn-chip" title={`Замечаний перед публикацией: ${authoringIssueCount}`}>
            Замечаний: {authoringIssueCount}
          </span>
        ) : null}
        <button
          type="button"
          className={["ctb-btn ctb-btn--ghost", !metadataReady ? "ctb-btn--warn" : ""].filter(Boolean).join(" ")}
          onClick={onOpenMetadata}
          title={metadataReady ? "Редактировать текст для посетителя" : "Заполните текст для посетителя (кнопка «Метаданные»)"}
        >
          Метаданные
        </button>
        <button type="button" className="ctb-btn ctb-btn--ghost" onClick={onPreview}>
          Предпросмотр
        </button>
        <button
          type="button"
          className={["ctb-btn ctb-btn--save", hasChanges ? "has-changes" : ""].filter(Boolean).join(" ")}
          onClick={onSave}
        >
          Сохранить
        </button>
        <button
          type="button"
          className="ctb-btn ctb-btn--publish"
          aria-disabled={!canPublish}
          title={
            !serviceId.trim()
              ? "Укажите ID услуги в поле выше"
              : !metadataReady
                ? "Откройте «Метаданные» и заполните текст перед формой"
                : authoringIssueCount > 0
                  ? `Перед публикацией устраните замечания (${authoringIssueCount})`
                : undefined
          }
          onClick={() => {
            if (!serviceId.trim()) {
              onPublish();
              return;
            }
            if (!canPublish && !metadataReady) {
              onOpenMetadata();
              return;
            }
            onPublish();
          }}
        >
          Опубликовать
        </button>
      </div>
    </header>
  );
}
