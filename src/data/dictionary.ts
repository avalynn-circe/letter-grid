// The word list ships as a real bundled JSON asset (assets/dictionary.json),
// mirroring the web build's move to a sibling file. Metro bundles JSON
// directly, so the old gzip+base64+pako pipeline is gone entirely.
import DICTIONARY_WORDS from "../../assets/dictionary.json";

let cachedDictionary: Set<string> | null = null;

/**
 * Builds the word Set once; the result is cached in memory for the app's
 * lifetime.
 */
export function loadDictionary(): Set<string> {
  if (cachedDictionary) return cachedDictionary;
  cachedDictionary = new Set(DICTIONARY_WORDS as string[]);
  return cachedDictionary;
}
