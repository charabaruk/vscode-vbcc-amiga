import * as vscode from "vscode";
import { trace } from "../core";

interface VbccAttributeDoc {
  signature: string;
  detail: string;
  completionDetail: string;
  completionInsertText: vscode.SnippetString;
}

const VBCC_ATTRIBUTE_DOCS: Readonly<Record<string, VbccAttributeDoc>> = {
  __saveds: {
    signature: "__saveds",
    detail: "Marks a function for resident-library style calling conventions used by Amiga system components.",
    completionDetail: "VBCC attribute",
    completionInsertText: new vscode.SnippetString("__saveds"),
  },
  __chip: {
    signature: "__chip",
    detail: "Places object storage in Chip RAM.",
    completionDetail: "VBCC memory attribute",
    completionInsertText: new vscode.SnippetString("__chip"),
  },
  __far: {
    signature: "__far",
    detail: "Declares far-addressed data/function references for target-specific memory models.",
    completionDetail: "VBCC memory attribute",
    completionInsertText: new vscode.SnippetString("__far"),
  },
  __near: {
    signature: "__near",
    detail: "Declares near-addressed data/function references for target-specific memory models.",
    completionDetail: "VBCC memory attribute",
    completionInsertText: new vscode.SnippetString("__near"),
  },
  __interrupt: {
    signature: "__interrupt",
    detail: "Marks a function as an interrupt handler.",
    completionDetail: "VBCC interrupt attribute",
    completionInsertText: new vscode.SnippetString("__interrupt"),
  },
  __amigainterrupt: {
    signature: "__amigainterrupt",
    detail: "Marks a function as an Amiga-specific interrupt handler.",
    completionDetail: "VBCC interrupt attribute",
    completionInsertText: new vscode.SnippetString("__amigainterrupt"),
  },
  __saveall: {
    signature: "__saveall",
    detail: "Preserves all registers in the function prologue/epilogue.",
    completionDetail: "VBCC PPC function attribute",
    completionInsertText: new vscode.SnippetString("__saveall"),
  },
  __section: {
    signature: "__section(\"name\") or __section(\"name\", \"attributes\")",
    detail: "Assigns code/data to a named section. 68k form uses one argument; PPC form accepts two arguments.",
    completionDetail: "VBCC section attribute (1-arg 68k, 2-arg PPC)",
    completionInsertText: new vscode.SnippetString("__section(\"${1:name}\", \"${2:attributes}\")"),
  },
  __reg: {
    signature: "__reg(\"registerName\")",
    detail: "Binds a variable or parameter to a specific register.",
    completionDetail: "VBCC register attribute",
    completionInsertText: new vscode.SnippetString("__reg(\"${1:registerName}\")"),
  },
  __entry: {
    signature: "__entry",
    detail: "Prevents objects marked with it from being removed by unused object elimination.",
    completionDetail: "VBCC attribute",
    completionInsertText: new vscode.SnippetString("__entry"),
  },
  __inline: {
    signature: "__inline",
    detail: "Requests inline expansion where possible.",
    completionDetail: "VBCC inline attribute",
    completionInsertText: new vscode.SnippetString("__inline"),
  },
  __typeof: {
    signature: "__typeof(expression)",
    detail: "Yields the type of an expression (vbcc extension).",
    completionDetail: "VBCC type operator",
    completionInsertText: new vscode.SnippetString("__typeof(${1:expression})"),
  },
  __alignof: {
    signature: "__alignof(typeOrExpr)",
    detail: "Yields alignment requirements of a type or expression.",
    completionDetail: "VBCC alignment operator",
    completionInsertText: new vscode.SnippetString("__alignof(${1:typeOrExpr})"),
  },
  __offsetof: {
    signature: "__offsetof(type, member)",
    detail: "Yields byte offset of a member within a struct/union.",
    completionDetail: "VBCC layout operator",
    completionInsertText: new vscode.SnippetString("__offsetof(${1:type}, ${2:member})"),
  },
  __regsused: {
    signature: "__regsused(\"registerList\")",
    detail: "Annotates registers clobbered or required by code.",
    completionDetail: "VBCC register metadata attribute",
    completionInsertText: new vscode.SnippetString("__regsused(\"${1:registerList}\")"),
  },
  __varsmodified: {
    signature: "__varsmodified(\"variableList\")",
    detail: "Annotates variables modified by a function/code block.",
    completionDetail: "VBCC side-effect metadata attribute",
    completionInsertText: new vscode.SnippetString("__varsmodified(\"${1:variableList}\")"),
  },
  __writesmem: {
    signature: "__writesmem(\"memoryType\")",
    detail: "Annotates memory classes written by the function.",
    completionDetail: "VBCC memory-side-effect attribute",
    completionInsertText: new vscode.SnippetString("__writesmem(\"${1:memoryType}\")"),
  },
  __readsmem: {
    signature: "__readsmem(\"memoryType\")",
    detail: "Annotates memory classes read by the function.",
    completionDetail: "VBCC memory-side-effect attribute",
    completionInsertText: new vscode.SnippetString("__readsmem(\"${1:memoryType}\")"),
  },
};

const ATTRIBUTES = Object.keys(VBCC_ATTRIBUTE_DOCS);
const ATTRIBUTE_WORD_PATTERN = /\b__[A-Za-z_][A-Za-z0-9_]*\b/;
const ATTRIBUTE_PREFIX_PATTERN = /__\w*$/;
const SELECTOR: vscode.DocumentSelector = [
  { language: "c", scheme: "file" },
  { language: "cpp", scheme: "file" },
];

class VbccAttributeHoverProvider implements vscode.HoverProvider {
  public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const range = document.getWordRangeAtPosition(position, ATTRIBUTE_WORD_PATTERN);
    if (!range) {
      return undefined;
    }

    const symbol = document.getText(range);
    const doc = VBCC_ATTRIBUTE_DOCS[symbol];
    if (!doc) {
      return undefined;
    }

    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown(`**${doc.signature}**\n\n${doc.detail}`);
    markdown.isTrusted = false;

    return new vscode.Hover(markdown, range);
  }
}

class VbccAttributeCompletionProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    const linePrefix = document.lineAt(position).text.slice(0, position.character);
    if (!ATTRIBUTE_PREFIX_PATTERN.test(linePrefix)) {
      return [];
    }

    return ATTRIBUTES.map((name, index) => {
      const doc = VBCC_ATTRIBUTE_DOCS[name];
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Keyword);
      item.detail = doc.completionDetail;
      item.documentation = new vscode.MarkdownString(`**${doc.signature}**\n\n${doc.detail}`);
      item.insertText = doc.completionInsertText;
      item.sortText = `${index.toString().padStart(3, "0")}_${name}`;
      return item;
    });
  }
}

export function registerVbccAttributeHelpProvider(context: vscode.ExtensionContext): void {
  trace("registerVbccAttributeHelpProvider start");

  const hoverProvider = vscode.languages.registerHoverProvider(SELECTOR, new VbccAttributeHoverProvider());
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    SELECTOR,
    new VbccAttributeCompletionProvider(),
    "_",
  );

  context.subscriptions.push(hoverProvider, completionProvider);
  trace("registerVbccAttributeHelpProvider complete");
}