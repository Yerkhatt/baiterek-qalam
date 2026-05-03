import { FileMeta, FormField, Validator } from "./types";
import { isEmpty } from "./utils";

export function validateFieldValue(field: FormField, value: unknown): string | null {
  if (!field.validators || field.validators.length === 0) {
    return null;
  }

  for (const validator of field.validators) {
    const error = runValidator(validator, value);
    if (error) {
      return error;
    }
  }

  return null;
}

export function validateFileSet(
  files: FileMeta[] | undefined,
  validator: Extract<Validator, { type: "file" }>
): string | null {
  const list = files ?? [];
  const { mime_types, max_size_mb, max_count } = validator.value;

  if (typeof max_count === "number" && list.length > max_count) {
    return "validation.file.maxCount";
  }

  for (const file of list) {
    if (mime_types && file.mimeType && !mime_types.includes(file.mimeType)) {
      return "validation.file.mime";
    }
    if (typeof max_size_mb === "number" && typeof file.sizeMb === "number") {
      if (file.sizeMb > max_size_mb) {
        return "validation.file.maxSize";
      }
    }
  }

  return null;
}

function runValidator(validator: Validator, value: unknown): string | null {
  switch (validator.type) {
    case "required":
      return isEmpty(value) ? "validation.required" : null;
    case "min":
      return typeof value === "number" && value < validator.value
        ? "validation.min"
        : null;
    case "max":
      return typeof value === "number" && value > validator.value
        ? "validation.max"
        : null;
    case "minLength":
      return typeof value === "string" && value.length < validator.value
        ? "validation.minLength"
        : null;
    case "maxLength":
      return typeof value === "string" && value.length > validator.value
        ? "validation.maxLength"
        : null;
    case "regex":
      if (typeof value !== "string") {
        return null;
      }
      return new RegExp(validator.value).test(value) ? null : "validation.regex";
    case "enum":
      return validator.value.includes(value as string | number)
        ? null
        : "validation.enum";
    case "dateRange":
      if (!value) {
        return null;
      }
      return validateDateRange(value, validator.value);
    case "numberPrecision":
      return validatePrecision(value, validator.value);
    case "file":
      return validateFileSet(value as FileMeta[], validator);
    default:
      return null;
  }
}

function validateDateRange(
  value: unknown,
  range: { min?: string; max?: string }
): string | null {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return "validation.date";
  }
  if (range.min) {
    const minDate = new Date(range.min);
    if (date < minDate) {
      return "validation.date.min";
    }
  }
  if (range.max) {
    const maxDate = new Date(range.max);
    if (date > maxDate) {
      return "validation.date.max";
    }
  }
  return null;
}

function validatePrecision(value: unknown, precision: number): string | null {
  if (typeof value !== "number") {
    return null;
  }
  const text = String(value);
  const parts = text.split(".");
  if (parts.length < 2) {
    return null;
  }
  return parts[1].length > precision ? "validation.precision" : null;
}
