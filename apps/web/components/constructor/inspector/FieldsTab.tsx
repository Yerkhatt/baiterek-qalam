"use client";

/**
 * Google Forms–style editor for step nodes.
 * Persisted shape stays {@link FormField}: option.value is what Switch compares — keep it stable when editing labels.
 */

import { useMemo, type KeyboardEvent } from "react";
import type { FieldType, FormField, FormNode, FormSchema, TableColumn, Validator } from "@qalam/form-engine";
import { t } from "@/lib/i18n";
import {
  dictionaryKeys,
  resolvedOptionRows,
  rowsToFieldOptions,
  suggestOptionValue,
  syncOptionValueFromLabel
} from "@/lib/form-builder/fieldOptions";

interface Props {
  node: FormNode;
  schema: FormSchema;
  onUpdate: (updates: Partial<FormNode>) => void;
}

/** Canonical types; labels come from i18n (`forms.constructor.form_builder.types.*`). */
const ALL_TYPES: FieldType[] = [
  "text",
  "number",
  "date",
  "select",
  "radio",
  "file"
];

const CHOICE_TYPES = new Set<FieldType>(["select", "radio"]);

const VALIDATOR_OPTIONS: Array<{ value: Validator["type"]; labelKey: string }> = [
  { value: "required", labelKey: "forms.constructor.form_builder.validators.required" },
  { value: "min", labelKey: "forms.constructor.form_builder.validators.min" },
  { value: "max", labelKey: "forms.constructor.form_builder.validators.max" },
  { value: "minLength", labelKey: "forms.constructor.form_builder.validators.minLength" },
  { value: "maxLength", labelKey: "forms.constructor.form_builder.validators.maxLength" },
  { value: "regex", labelKey: "forms.constructor.form_builder.validators.regex" },
  { value: "enum", labelKey: "forms.constructor.form_builder.validators.enum" },
  { value: "numberPrecision", labelKey: "forms.constructor.form_builder.validators.numberPrecision" }
];

function newQuestionId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseOptions(raw: string): FormField["options"] {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith("[")) return trimmed;
  try {
    return JSON.parse(trimmed) as FormField["options"];
  } catch {
    return undefined;
  }
}

function validatorsToText(validators: Validator[] | undefined): string {
  return JSON.stringify(validators ?? [], null, 2);
}

function parseValidators(raw: string): Validator[] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as Validator[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Browsers use Tab for focus navigation; this inserts visible spaces at the caret (editor-style). */
const TAB_SOFT_INSERT = "  ";

function tabInsertsSpacesKeyDown(
  e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  value: string,
  apply: (next: string) => void
): void {
  if (e.key !== "Tab" || e.nativeEvent.isComposing) return;
  // Shift+Tab: keep default so users can still move focus backward.
  if (e.shiftKey) return;
  e.preventDefault();
  const el = e.currentTarget;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + TAB_SOFT_INSERT + value.slice(end);
  apply(next);
  const caret = start + TAB_SOFT_INSERT.length;
  requestAnimationFrame(() => {
    el.focus();
    try {
      el.setSelectionRange(caret, caret);
    } catch {
      /* noop */
    }
  });
}

function defaultField(): FormField {
  return {
    id: newQuestionId(),
    label_key: "",
    type: "text",
    required: false
  };
}

export function FieldsTab({ node, schema, onUpdate }: Props) {
  const fields = node.fields ?? [];
  const lastFieldIsEmpty = fields.length > 0 && !(fields[fields.length - 1].label_key ?? "").trim();

  const dictKeys = useMemo(() => dictionaryKeys(schema), [schema]);

  function setFields(next: FormField[]) {
    onUpdate({ fields: next });
  }

  function addQuestion() {
    if (lastFieldIsEmpty) return;
    setFields([...fields, defaultField()]);
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function moveField(index: number, delta: -1 | 1) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setFields(next);
  }

  return (
    <div className="fb-panel insp-section-list">
      <div className="fb-toolbar insp-section">
        <div className="fb-toolbar-text">
          <div className="insp-section-title">{t("forms.constructor.form_builder.panel_title")}</div>
        </div>
        <button type="button" className="insp-btn-primary fb-add-btn" onClick={addQuestion} disabled={lastFieldIsEmpty}>
          {t("forms.constructor.form_builder.add_question")}
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="insp-empty">{t("forms.constructor.form_builder.empty")}</div>
      ) : null}

      {fields.map((field, index) => (
        <QuestionCard
          key={field.id}
          field={field}
          index={index}
          total={fields.length}
          schema={schema}
          dictionaryKeys={dictKeys}
          onChange={(patch) => updateField(field.id, patch)}
          onRemove={() => removeField(field.id)}
          onMoveUp={() => moveField(index, -1)}
          onMoveDown={() => moveField(index, 1)}
        />
      ))}

      <div className="insp-section">
        <button
          type="button"
          className="insp-btn-primary fb-add-btn fb-add-btn--bottom"
          onClick={addQuestion}
          disabled={lastFieldIsEmpty}
        >
          + {t("forms.constructor.form_builder.add_question")}
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  field,
  index,
  total,
  schema,
  dictionaryKeys: dictKeys,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown
}: {
  field: FormField;
  index: number;
  total: number;
  schema: FormSchema;
  dictionaryKeys: string[];
  onChange: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const choiceMode = CHOICE_TYPES.has(field.type);
  const dictMode = typeof field.options === "string";
  const hasDictionaries = dictKeys.length > 0;
  const showDictionaryControls = choiceMode && (dictMode || hasDictionaries);
  const rows = choiceMode
    ? (Array.isArray(field.options)
      ? field.options.map((option) => ({
        value: option.value,
        labelText: option.label_key ?? ""
      }))
      : resolvedOptionRows(field, schema))
    : [];

  function setOptionRows(nextRows: typeof rows) {
    onChange({ options: rowsToFieldOptions(nextRows) });
  }

  function addOptionRow() {
    const existing = new Set(rows.map((r) => String(r.value)));
    const label = "";
    const value = suggestOptionValue(label, rows.length, existing);
    setOptionRows([...rows, { value, labelText: label }]);
  }

  function updateOptionRow(i: number, patch: Partial<(typeof rows)[0]>) {
    setOptionRows(rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function removeOptionRow(i: number) {
    setOptionRows(rows.filter((_, j) => j !== i));
  }

  function onTypeChange(nextType: FieldType) {
    const patch: Partial<FormField> = { type: nextType };
    if (!CHOICE_TYPES.has(nextType)) {
      patch.options = undefined;
      patch.multiline = undefined;
    }
    if (nextType === "table") {
      patch.columns = field.columns ?? [];
    }
    if (nextType === "text") {
      patch.multiline = field.multiline;
    }
    if (CHOICE_TYPES.has(nextType) && !field.options) {
      const v0 = suggestOptionValue("", 0, new Set());
      patch.options = [
        { value: v0, label_key: "" }
      ];
    }
    onChange(patch);
  }

  return (
    <div className="fb-question insp-section">
      <div className="fb-question-head">
        <span className="fb-question-index">{index + 1}</span>
        <div className="fb-question-actions">
          <button type="button" className="fb-icon-btn" disabled={index <= 0} onClick={onMoveUp} title={t("forms.constructor.form_builder.move_up")} aria-label={t("forms.constructor.form_builder.move_up")}>
            ↑
          </button>
          <button type="button" className="fb-icon-btn" disabled={index >= total - 1} onClick={onMoveDown} title={t("forms.constructor.form_builder.move_down")} aria-label={t("forms.constructor.form_builder.move_down")}>
            ↓
          </button>
          <button type="button" className="fb-icon-btn fb-icon-btn--danger" onClick={onRemove} title={t("forms.constructor.form_builder.remove")} aria-label={t("forms.constructor.form_builder.remove")}>
            ×
          </button>
        </div>
      </div>

      <div className="insp-row">
        <input
          className="insp-input"
          value={field.label_key ?? ""}
          placeholder={t("forms.constructor.form_builder.question_placeholder")}
          aria-label={t("forms.constructor.form_builder.question_title")}
          onChange={(e) => onChange({ label_key: e.target.value })}
          onKeyDown={(e) =>
            tabInsertsSpacesKeyDown(e, field.label_key ?? "", (next) => onChange({ label_key: next }))
          }
        />
      </div>

      <div className="insp-row">
        <textarea
          className="insp-textarea"
          rows={2}
          value={field.help_key ?? ""}
          placeholder={t("forms.constructor.form_builder.description_ph")}
          aria-label={t("forms.constructor.form_builder.description")}
          onChange={(e) => onChange({ help_key: e.target.value || undefined })}
          onKeyDown={(e) =>
            tabInsertsSpacesKeyDown(e, field.help_key ?? "", (next) =>
              onChange({ help_key: next || undefined })
            )
          }
        />
      </div>

      <div className="insp-row insp-row--inline fb-type-row">
        <select
          className="insp-select"
          value={field.type}
          aria-label={t("forms.constructor.form_builder.question_type")}
          onChange={(e) => onTypeChange(e.target.value as FieldType)}
        >
          {ALL_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`forms.constructor.form_builder.types.${type}`)}
            </option>
          ))}
        </select>
        <label className="insp-checkbox-label">
          <input
            type="checkbox"
            checked={Boolean(field.required)}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          {t("forms.constructor.form_builder.required")}
        </label>
      </div>

      {field.type === "text" ? (
        <label className="insp-checkbox-label">
          <input
            type="checkbox"
            checked={Boolean(field.multiline)}
            onChange={(e) => onChange({ multiline: e.target.checked })}
          />
          {t("forms.constructor.form_builder.paragraph")}
        </label>
      ) : null}

      {choiceMode ? (
        <div className="fb-choice-block">
          {dictMode ? (
            <p className="fb-hint">{t("forms.constructor.form_builder.dictionary_preview")}</p>
          ) : (
            <>
              {rows.map((row, i) => (
                <div key={`${field.id}-opt-${i}`} className="fb-option-row">
                  <input
                    className="insp-input insp-input--sm"
                    value={row.labelText}
                    placeholder={t("forms.constructor.form_builder.option_label_ph")}
                    onChange={(e) => updateOptionRow(i, { labelText: e.target.value })}
                    onKeyDown={(e) =>
                      tabInsertsSpacesKeyDown(e, row.labelText, (next) =>
                        updateOptionRow(i, { labelText: next })
                      )
                    }
                    onBlur={() => {
                      const nextRows = rows.map((r, j) =>
                        j === i ? { ...r, labelText: r.labelText.trim() } : r
                      );
                      setOptionRows(syncOptionValueFromLabel(nextRows, i));
                    }}
                  />
                  <button type="button" className="fb-icon-btn" onClick={() => removeOptionRow(i)} aria-label={t("forms.constructor.form_builder.remove_option")}>
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="fb-add-option-link" onClick={addOptionRow}>
                {t("forms.constructor.form_builder.add_option")}
              </button>
            </>
          )}
        </div>
      ) : null}

      {field.type === "table" ? (
        <TableColumnsEditor field={field} onChange={onChange} />
      ) : null}

      <details className="fb-more">
        <summary>{t("forms.constructor.form_builder.more")}</summary>
        <div className="fb-more-body">
          {showDictionaryControls ? (
            <div className="insp-row">
              <label className="insp-label">{t("forms.constructor.form_builder.options_source")}</label>
              <select
                className="insp-select insp-select--sm"
                value={typeof field.options === "string" ? field.options : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    const v0 = suggestOptionValue("", 0, new Set());
                    const existing = rows.length > 0 ? rows : [
                      { value: v0, labelText: "" }
                    ];
                    onChange({ options: rowsToFieldOptions(existing) });
                  } else {
                    onChange({ options: v });
                  }
                }}
              >
                <option value="">{t("forms.constructor.form_builder.options_custom")}</option>
                {dictKeys.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              {dictMode ? <p className="fb-hint">{t("forms.constructor.form_builder.dictionary_locked")}</p> : null}
            </div>
          ) : null}

          <div className="insp-row">
            <label className="insp-label">{t("forms.constructor.form_builder.internal_id")}</label>
            <input className="insp-input insp-input--sm fb-mono" value={field.id} readOnly />
            <p className="fb-hint">{t("forms.constructor.form_builder.internal_id_hint")}</p>
          </div>
          <div className="insp-row">
            <label className="insp-label">{t("forms.constructor.form_builder.mask")}</label>
            <input
              className="insp-input insp-input--sm"
              value={field.mask ?? ""}
              onChange={(e) => onChange({ mask: e.target.value || undefined })}
            />
          </div>
          <div className="insp-row">
            <label className="insp-label">{t("forms.constructor.form_builder.validators_json")}</label>
            <textarea
              className="insp-textarea insp-textarea--code"
              rows={3}
              defaultValue={validatorsToText(field.validators)}
              onBlur={(e) => onChange({ validators: parseValidators(e.target.value) })}
            />
          </div>
          <div className="insp-row insp-row--inline">
            <label className="insp-label">{t("forms.constructor.form_builder.quick_validator")}</label>
            <select
              className="insp-select insp-select--sm"
              defaultValue=""
              onChange={(event) => {
                const type = event.target.value as Validator["type"];
                if (!type) return;
                const validators = [...(field.validators ?? [])];
                if (type === "required") validators.push({ type: "required" });
                else if (type === "regex") validators.push({ type: "regex", value: "^.+$" });
                else if (type === "enum") validators.push({ type: "enum", value: [] });
                else if (type === "numberPrecision") validators.push({ type: "numberPrecision", value: 2 });
                else validators.push({ type, value: 0 } as Validator);
                onChange({ validators });
                event.currentTarget.value = "";
              }}
            >
              <option value="">—</option>
              {VALIDATOR_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {t(v.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="insp-row">
            <label className="insp-label">{t("forms.constructor.form_builder.raw_options_json")}</label>
            <textarea
              className="insp-textarea insp-textarea--code"
              rows={2}
              defaultValue={
                typeof field.options === "string"
                  ? field.options
                  : JSON.stringify(field.options ?? [], null, 2)
              }
              onBlur={(event) => onChange({ options: parseOptions(event.target.value) })}
            />
          </div>
          <label className="insp-checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(field.read_only)}
              onChange={(e) => onChange({ read_only: e.target.checked })}
            />
            {t("forms.constructor.form_builder.read_only")}
          </label>
        </div>
      </details>
    </div>
  );
}

function TableColumnsEditor({
  field,
  onChange
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
}) {
  const columns = field.columns ?? [];

  function addColumn() {
    const nextColumn: TableColumn = {
      id: `column_${Date.now()}`,
      label_key: "",
      type: "text",
      required: false
    };
    onChange({ columns: [...columns, nextColumn] });
  }

  function updateColumn(columnId: string, patch: Partial<TableColumn>) {
    onChange({
      columns: columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c))
    });
  }

  function removeColumn(columnId: string) {
    onChange({ columns: columns.filter((c) => c.id !== columnId) });
  }

  return (
    <div className="fb-table-cols">
      <div className="insp-section-title">{t("forms.constructor.form_builder.table_columns")}</div>
      {columns.map((column) => (
        <div key={column.id} className="insp-field-card">
          <div className="insp-field-card-head">
            <span className="insp-field-id">{column.id}</span>
            <button type="button" className="insp-field-remove" onClick={() => removeColumn(column.id)}>
              ×
            </button>
          </div>
          <div className="insp-row">
            <label className="insp-label">{t("forms.constructor.form_builder.column_title")}</label>
            <input
              className="insp-input insp-input--sm"
              value={column.label_key ?? ""}
              onChange={(e) => updateColumn(column.id, { label_key: e.target.value })}
              onKeyDown={(e) =>
                tabInsertsSpacesKeyDown(e, column.label_key ?? "", (next) =>
                  updateColumn(column.id, { label_key: next })
                )
              }
            />
          </div>
          <div className="insp-row insp-row--inline">
            <label className="insp-label">{t("forms.constructor.form_builder.column_type")}</label>
            <select
              className="insp-select insp-select--sm"
              value={column.type}
              onChange={(e) => updateColumn(column.id, { type: e.target.value as FieldType })}
            >
              {ALL_TYPES.filter((x) => x !== "table" && x !== "group" && x !== "repeat").map((type) => (
                <option key={type} value={type}>
                  {t(`forms.constructor.form_builder.types.${type}`)}
                </option>
              ))}
            </select>
            <label className="insp-checkbox-label">
              <input
                type="checkbox"
                checked={Boolean(column.required)}
                onChange={(e) => updateColumn(column.id, { required: e.target.checked })}
              />
              {t("forms.constructor.form_builder.required")}
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="insp-btn-primary" onClick={addColumn}>
        {t("forms.constructor.form_builder.add_column")}
      </button>
    </div>
  );
}
