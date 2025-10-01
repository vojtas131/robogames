import cz from "./cz.json";
import en from "./en.json";

let currentLang = localStorage.getItem("lang") || "cz";
const languages = { cz, en };

export function t(key, vars = {}) {
    //key - key to get value
    //vars - placeholders to replace
    let text = languages[currentLang][key] || key;
    for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{{${name}}}`, value);
    }
    return text;
}