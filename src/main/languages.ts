
export const allowedLanguages: string[] = [
  "English",
  "Italian",
  "Chinese",
  "Hindi",
  "Spanish",
  "French",
  "Arabic",
  "Bengali",
  "Russian",
  "Portuguese",
  "Urdu",
  "Indonesian",
  "German",
  "Japanese",
  "Nigerian Pidgin",
  "Egyptian Arabic",
  "Marathi",
  "Vietnamese",
  "Telugu",
  "Turkish",
  "Tamil",
];

export const allowedAudioContextLanguages: string[] = [
  "en",   // English
  "it",   // Italian
  "zh",   // Chinese
  "hi",   // Hindi
  "es",   // Spanish
  "fr",   // French
  "ar",   // Arabic
  "bn",   // Bengali
  "ru",   // Russian
  "pt",   // Portuguese
  "ur",   // Urdu
  "id",   // Indonesian
  "de",   // German
  "ja",   // Japanese
  "pcm",  // Nigerian Pidgin
  "arz",  // Egyptian Arabic
  "mr",   // Marathi
  "vi",   // Vietnamese
  "te",   // Telugu
  "tr",   // Turkish
  "ta",   // Tamil
];

export function isValidLanguage(language: string): boolean {
  return allowedLanguages.includes(language);
}

// Controlla se il codice audioContextLanguage è valido
export function isValidAudioContextLanguage(code: string): boolean {
  return allowedAudioContextLanguages.includes(code);
}