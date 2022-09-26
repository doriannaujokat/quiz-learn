export declare type TranslationEntries = {default: string} & Record<string, string>;
export declare type Operator = "+" | "-" | "*" | "/" | "%";

export function findLanguageEntry(languages: readonly string[]|string, entries: TranslationEntries): string {
    if (typeof languages === "string") languages = [languages];
    for (const l of languages) {
        for (const e in entries) {
            if (l.startsWith(e)) return entries[e];
        }
    }
    if (entries.default in entries) return entries[entries.default];
    return entries.default;
}

export function OperatorToString(operator: Operator): TranslationEntries;
export function OperatorToString(operator: Operator, lang: string[]|string): string;
export function OperatorToString(operator: Operator, lang?: string[]|string): TranslationEntries|string {
    if (lang !== undefined && lang !== null) {
        if (typeof lang === "string") lang = [lang];
        return findLanguageEntry(lang, OperatorToString(operator));
    }
    switch (operator) {
        default:
        case "+": return {
            default: "en",
            en: "addition",
            de: "Addition",
        }
        case "-": return {
            default: "en",
            en: "subtraction",
            de: "Subtraktion",
        }
        case "*": return {
            default: "en",
            en: "multiplication",
            de: "Multiplikation",
        }
        case "/": return {
            default: "en",
            en: "division",
            de: "Division",
        }
        case "%": return {
            default: "en",
            en: "modular arithmetic",
            de: "Modularer Arithmetik",
        }
    }
}
