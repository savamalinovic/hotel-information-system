/* global __dirname */

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.join(__dirname, "..");
const localeDirectory = path.join(projectRoot, "assets", "locales");
const sourceDirectories = [path.join(projectRoot, "app"), path.join(projectRoot, "src")];

function readLocale(filename) {
  return JSON.parse(fs.readFileSync(path.join(localeDirectory, filename), "utf8"));
}

function collectLeafKeys(value, prefix = "", keys = new Set()) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectLeafKeys(child, prefix ? `${prefix}.${key}` : key, keys);
    }
    return keys;
  }

  keys.add(prefix);
  return keys;
}

function collectSourceFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(entryPath, files);
    } else if (entry.isFile() && [".ts", ".tsx"].includes(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

function getSymbol(checker, node) {
  return checker.getSymbolAtLocation(node);
}

function getImportedName(element) {
  return element.propertyName?.text ?? element.name.text;
}

function getStaticKey(expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  return undefined;
}

function collectTranslationReferences(sourceFiles) {
  const program = ts.createProgram(sourceFiles, {
    jsx: ts.JsxEmit.ReactJSX,
    noEmit: true,
    noResolve: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  });
  const checker = program.getTypeChecker();
  const references = [];

  for (const sourceFilePath of sourceFiles) {
    const sourceFile = program.getSourceFile(sourceFilePath);
    if (!sourceFile) {
      continue;
    }

    const useTranslationSymbols = new Set();
    const translationFunctionSymbols = new Set();
    const i18nObjectSymbols = new Set();

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }

      const moduleName = statement.moduleSpecifier.text;
      const importClause = statement.importClause;
      if (!importClause) {
        continue;
      }

      if ((moduleName === "i18next" || moduleName === "@/i18n" || moduleName.endsWith("/i18n")) && importClause.name) {
        const symbol = getSymbol(checker, importClause.name);
        if (symbol) {
          i18nObjectSymbols.add(symbol);
        }
      }

      const namedBindings = importClause.namedBindings;
      if (!namedBindings || !ts.isNamedImports(namedBindings)) {
        continue;
      }

      for (const element of namedBindings.elements) {
        const symbol = getSymbol(checker, element.name);
        if (!symbol) {
          continue;
        }

        const importedName = getImportedName(element);
        if (moduleName === "react-i18next" && importedName === "useTranslation") {
          useTranslationSymbols.add(symbol);
        }
        if (moduleName === "i18next" && importedName === "t") {
          translationFunctionSymbols.add(symbol);
        }
        if (moduleName === "i18next" && importedName === "i18n") {
          i18nObjectSymbols.add(symbol);
        }
      }
    }

    function isUseTranslationCall(node) {
      if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) {
        return false;
      }
      const symbol = getSymbol(checker, node.expression);
      return symbol !== undefined && useTranslationSymbols.has(symbol);
    }

    function collectBindings(node) {
      if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer && isUseTranslationCall(node.initializer)) {
        for (const element of node.name.elements) {
          const propertyName = getImportedName(element);
          const symbol = getSymbol(checker, element.name);
          if (!symbol) {
            continue;
          }
          if (propertyName === "t") {
            translationFunctionSymbols.add(symbol);
          }
          if (propertyName === "i18n") {
            i18nObjectSymbols.add(symbol);
          }
        }
      }
      ts.forEachChild(node, collectBindings);
    }

    collectBindings(sourceFile);

    function isTranslationCall(node) {
      if (ts.isIdentifier(node.expression)) {
        const symbol = getSymbol(checker, node.expression);
        return symbol !== undefined && translationFunctionSymbols.has(symbol);
      }

      if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "t" && ts.isIdentifier(node.expression.expression)) {
        const symbol = getSymbol(checker, node.expression.expression);
        return symbol !== undefined && i18nObjectSymbols.has(symbol);
      }

      return false;
    }

    function collectCalls(node) {
      if (ts.isCallExpression(node) && isTranslationCall(node) && node.arguments.length > 0) {
        const key = getStaticKey(node.arguments[0]);
        if (key !== undefined) {
          const position = sourceFile.getLineAndCharacterOfPosition(node.arguments[0].getStart(sourceFile));
          references.push({
            file: path.relative(projectRoot, sourceFilePath).split(path.sep).join("/"),
            key,
            line: position.line + 1,
          });
        }
      }
      ts.forEachChild(node, collectCalls);
    }

    collectCalls(sourceFile);
  }

  return references;
}

function printKeys(label, keys) {
  if (keys.length === 0) {
    return;
  }

  console.error(`${label}:`);
  for (const key of keys) {
    console.error(`  - ${key}`);
  }
}

function printMissingReferences(references, enKeys, srKeys) {
  const missingReferences = references.filter((reference) => !enKeys.has(reference.key) || !srKeys.has(reference.key));
  if (missingReferences.length === 0) {
    return 0;
  }

  console.error("Referenced locale keys missing from a locale file:");
  for (const reference of missingReferences) {
    const missingLocales = [!enKeys.has(reference.key) ? "EN" : undefined, !srKeys.has(reference.key) ? "SR" : undefined]
      .filter(Boolean)
      .join(", ");
    console.error(`  - ${reference.key} (${reference.file}:${reference.line}; missing: ${missingLocales})`);
  }
  return missingReferences.length;
}

try {
  const enKeys = collectLeafKeys(readLocale("en.json"));
  const srKeys = collectLeafKeys(readLocale("sr.json"));
  const enOnly = [...enKeys].filter((key) => !srKeys.has(key)).sort();
  const srOnly = [...srKeys].filter((key) => !enKeys.has(key)).sort();
  const sourceFiles = sourceDirectories.flatMap((directory) => collectSourceFiles(directory));
  const references = collectTranslationReferences(sourceFiles);
  const missingReferenceCount = printMissingReferences(references, enKeys, srKeys);

  if (enOnly.length > 0 || srOnly.length > 0 || missingReferenceCount > 0) {
    console.error("Locale check failed.");
    printKeys("EN-only keys", enOnly);
    printKeys("SR-only keys", srOnly);
    process.exitCode = 1;
  } else {
    const uniqueReferenceCount = new Set(references.map((reference) => reference.key)).size;
    console.log(`Locale check passed (${enKeys.size} leaf keys per locale; ${references.length} static references, ${uniqueReferenceCount} unique keys).`);
  }
} catch (error) {
  console.error("Locale check could not complete.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
