import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import ts from "typescript";

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
};

async function compileModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions, fileName: relativePath });
  return `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`;
}

const enModuleUrl = await compileModule("../src/locales/en.ts");
const zhCNModuleUrl = await compileModule("../src/locales/zh-CN.ts");
const i18nSource = await readFile(new URL("../src/i18n.ts", import.meta.url), "utf8");
const i18nOutput = ts.transpileModule(i18nSource, { compilerOptions, fileName: "i18n.ts" }).outputText
  .replace('from "./locales/en"', `from "${enModuleUrl}"`)
  .replace('from "./locales/zh-CN"', `from "${zhCNModuleUrl}"`);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(i18nOutput).toString("base64")}`;
const {
  localeStrings,
  localeFromLanguage,
  resolveLocale,
  translate,
  translateLabelForLocale,
} = await import(moduleUrl);

assert.deepEqual(Object.keys(localeStrings["zh-CN"]), Object.keys(localeStrings.en));

assert.equal(localeFromLanguage("english"), "en");
assert.equal(localeFromLanguage("schinese"), "zh-CN");
assert.equal(localeFromLanguage("SteamChina_SChinese"), "zh-CN");
assert.equal(localeFromLanguage("zh_Hans"), "zh-CN");
assert.equal(localeFromLanguage("tchinese"), "en");
assert.equal(localeFromLanguage(""), null);

assert.equal(resolveLocale({ steamLanguage: "english", deckyLocales: ["zh-cn"] }), "en");
assert.equal(resolveLocale({ steamLanguage: "schinese", deckyLocales: ["en-us"] }), "zh-CN");
assert.equal(resolveLocale({ deckyLocales: ["zh-cn"], browserLanguages: ["en-US"] }), "zh-CN");
assert.equal(resolveLocale({ browserLanguages: ["zh-CN", "en-US"] }), "zh-CN");
assert.equal(resolveLocale({}), "en");

assert.equal(translate("en", "power.cpuGovernor"), "CPU Governor");
assert.equal(translate("zh-CN", "power.cpuGovernor"), "CPU 调频策略");
assert.equal(translate("zh-CN", "games.appFallback", { id: 123 }), "应用 123");
assert.equal(translateLabelForLocale("en", "Balanced"), "Balanced");
assert.equal(translateLabelForLocale("zh-CN", "Balanced"), "均衡");
assert.equal(translateLabelForLocale("zh-CN", "Big Cores (4-7)"), "大核心 (4-7)");
assert.equal(translateLabelForLocale("zh-CN", "Untranslated runtime label"), "Untranslated runtime label");

console.log("i18n tests passed: locale parity, English, Simplified Chinese, precedence, interpolation, and runtime labels");
