/**
 * An error that knows what it means, not what to say about it.
 *
 * The engines used to throw `new Error("Для объединения нужно минимум 2
 * ключа.")` — a Russian sentence produced two layers below anything that knows
 * what language the reader uses. The view could only pass it through, so the
 * English site showed Russian errors, and the string could not be improved
 * without touching the engine.
 *
 * So an engine states the case and the interface says it. The message text is
 * kept as a fallback for anything that catches this without a catalogue — a
 * test, a console, a caller that never expected it — because an error that
 * prints as `[object Object]` is worse than one in the wrong language.
 */

export interface LocalisedParams {
  [key: string]: string | number;
}

export class LocalisedError extends Error {
  /** Catalogue key naming what went wrong. */
  readonly key: string;
  /** Values the message interpolates. */
  readonly params: LocalisedParams;

  constructor(key: string, params: LocalisedParams = {}, fallback?: string) {
    super(fallback ?? key);
    this.name = "LocalisedError";
    this.key = key;
    this.params = params;
  }
}

/** A note worth showing that is not a failure — same shape, same treatment. */
export interface LocalisedNote {
  key: string;
  params?: LocalisedParams;
}

/**
 * Whatever was thrown, as something the reader can read.
 *
 * `translate` is passed in rather than imported so this stays free of the i18n
 * module: `shared` sits below the interface and importing upwards is how the
 * layering test earns its keep.
 */
export function localiseError(
  error: unknown,
  translate: (key: string, params?: LocalisedParams) => string,
): string {
  if (error instanceof LocalisedError) {
    return translate(error.key, error.params);
  }
  return error instanceof Error ? error.message : String(error);
}

/** A note, said out loud. */
export function localiseNote(
  note: LocalisedNote,
  translate: (key: string, params?: LocalisedParams) => string,
): string {
  return translate(note.key, note.params);
}
