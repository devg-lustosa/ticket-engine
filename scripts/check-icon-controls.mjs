import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith(".tsx")) files.push(file);
  }
}
walk("src");
let checked = 0;
const missing = [];
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const icons = new Set();
  for (const node of source.statements) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === "lucide-react") {
      for (const entry of node.importClause?.namedBindings?.elements ?? []) icons.add(entry.name.text);
    }
  }
  function visit(node) {
    if (ts.isJsxElement(node) && ["button", "Link", "a"].includes(node.openingElement.tagName.getText(source))) {
      let hasIcon = false;
      function inspect(child) {
        if ((ts.isJsxSelfClosingElement(child) && icons.has(child.tagName.getText(source))) || (ts.isJsxElement(child) && child.openingElement.tagName.getText(source) === "svg")) hasIcon = true;
        ts.forEachChild(child, inspect);
      }
      node.children.forEach(inspect);
      if (hasIcon) {
        checked++;
        if (!node.openingElement.attributes.properties.some(attribute => attribute.name?.getText(source) === "data-tooltip")) {
          missing.push(file + ":" + (source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1));
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (missing.length) { console.error("Controles com ícones sem tooltip:\n" + missing.join("\n")); process.exitCode = 1; }
else console.log(checked + " controles com ícones possuem tooltip. A checagem estática não substitui revisão de usabilidade.");
