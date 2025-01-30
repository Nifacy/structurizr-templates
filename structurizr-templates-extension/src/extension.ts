import * as vscode from "vscode";
import * as fs from "fs"

import * as scriptParser from "./parser";
import * as pattern from "./pattern"


interface PatternApplyInfo {
	range: vscode.Range;
	scriptApplyInfo: scriptParser.ScriptApplyInfo;
	patternInfo: pattern.PatternInfo;
};


async function openFileInNewTab(filePath: string): Promise<void> {
	if (!fs.existsSync(filePath)) {
		throw Error(`The file ${filePath} does not exist.`)
	}

	const openedDocument = await vscode.workspace.openTextDocument(filePath);
	await vscode.window.showTextDocument(openedDocument, vscode.ViewColumn.One);
}


function getPatternApply(document: vscode.TextDocument, applyRange: vscode.Range): PatternApplyInfo | undefined {
	const workspaceFilePath = document.fileName;
	const rawScriptApplyText = document.getText(applyRange);
	const scriptApplyInfo = scriptParser.ParseScriptApplyInfo(rawScriptApplyText);

	if (!pattern.IsPattern(workspaceFilePath, scriptApplyInfo.path)) {
		return undefined;
	}

	return {
		range: applyRange,
		scriptApplyInfo: scriptApplyInfo,
		patternInfo: pattern.GetPatternInfo(workspaceFilePath, scriptApplyInfo.path),
	};
}


class CodelensProvider implements vscode.CodeLensProvider {

	private codeLenses: vscode.CodeLens[] = [];
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {
		vscode.workspace.onDidChangeConfiguration((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		this.codeLenses = [];

		for (const applyRange of scriptParser.GetScriptApplyRanges(document)) {
			try {
				const info = getPatternApply(document, applyRange);
				if (info === undefined) {
					continue;
				}

				const goToDefinitionCommand: vscode.Command = {
					title: "Go to pattern definition",
					command: "structurizr-templates.showScriptDefinition",
					arguments: [info.patternInfo.scriptPath],
				};

				this.codeLenses.push(new vscode.CodeLens(info.range, goToDefinitionCommand));
			} catch (e) {
				console.log("Got error: ", e);
			}
		}

		return this.codeLenses;
	}

	public resolveCodeLens(codeLens: vscode.CodeLens, _token: vscode.CancellationToken) {
		return codeLens;
	}
}


class HoverProvider implements vscode.HoverProvider {
	provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.Hover> {
		for (const applyRange of scriptParser.GetScriptApplyRanges(document)) {
			if (!applyRange.contains(position)) {
				continue;
			}

			try {
				const info = getPatternApply(document, applyRange);
				if (info?.patternInfo.docs === undefined) {
					continue;
				}

				const markdownContent = new vscode.MarkdownString(info.patternInfo.docs);
				return new vscode.Hover(markdownContent, info.range);
			} catch (e) {
				console.log(`Got error: ${e}`);
			}
		}

		return undefined;
	}
}


class CompletionProvider implements vscode.CompletionItemProvider {
	provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext,
	): vscode.ProviderResult<vscode.CompletionItem[]> {
		console.log("Completion Provider called");

		for (const applyRange of scriptParser.GetScriptApplyRanges(document)) {
			if (!applyRange.contains(position)) {
				continue;
			}

			const info = getPatternApply(document, applyRange);
			if (info === undefined) {
				continue;
			}

			if (info.scriptApplyInfo.unfinishedArgumet !== undefined) {
				const arg = info.scriptApplyInfo.unfinishedArgumet;

				const args = (info.scriptApplyInfo.arguments ?? []).map(arg => arg.name);
				const params = info.patternInfo.params ?? [];
				const missingParams = params.filter(param => !args.includes(param));
				const suggestedParams = missingParams.filter(param => param.startsWith(arg));

				return suggestedParams.map(
					param => new vscode.CompletionItem(
						param,
						vscode.CompletionItemKind.Issue,
					)
				);
			}
		}

		return undefined;
	}
}


function createRequiredArgumentError(
	document: vscode.TextDocument,
	patternApplyInfo: PatternApplyInfo,
	extraArgument: string,
): vscode.Diagnostic {
	const scriptText = document.getText(patternApplyInfo.range);
	const scriptOffset = document.offsetAt(patternApplyInfo.range.start);

	const startIndex = scriptText.indexOf(extraArgument);
	const endIndex = startIndex + extraArgument.length;

	const startPosition = document.positionAt(scriptOffset + startIndex);
	const endPosition = document.positionAt(scriptOffset + endIndex);

	return {
		message: `Extra argument '${extraArgument}'`,
		range: new vscode.Range(startPosition, endPosition),
		severity: vscode.DiagnosticSeverity.Error,
	};
}


function createMissingParameterError(
	document: vscode.TextDocument,
	patternApplyInfo: PatternApplyInfo,
	missingParameter: string,
): vscode.Diagnostic {
	const scriptOffset = document.offsetAt(patternApplyInfo.range.start);
	const scriptText = document.getText(patternApplyInfo.range);

	const startHeaderPosition = document.positionAt(scriptOffset);
	const endHeaderPosition = document.positionAt(scriptOffset + scriptText.indexOf(" "));

	const headerRange = new vscode.Range(startHeaderPosition, endHeaderPosition);

	return {
		message: `Parameter '${missingParameter}' is required`,
		range: headerRange,
		severity: vscode.DiagnosticSeverity.Error,
	};
}


function checkArgumentsSet(
	document: vscode.TextDocument,
	patternApplyInfo: PatternApplyInfo,
): vscode.Diagnostic[] {
	const diagnostics: vscode.Diagnostic[] = [];

	console.log(`Script: ${patternApplyInfo.patternInfo.scriptPath}`);
	for (const arg of patternApplyInfo.scriptApplyInfo.arguments) {
		console.log(`- ${arg.name}`);
	}

	const args = patternApplyInfo.scriptApplyInfo.arguments ?? [];
	const argNames = args.map(arg => arg.name);
	const params = patternApplyInfo.patternInfo.params ?? [];

	const extraArgs = argNames.filter(arg => !params.includes(arg));
	const missingParams = params.filter(param => !argNames.includes(param));

	for (const extraArg of extraArgs) {
		diagnostics.push(createRequiredArgumentError(document, patternApplyInfo, extraArg));
	}

	for (const missingParam of missingParams) {
		diagnostics.push(createMissingParameterError(document, patternApplyInfo, missingParam));
	}

	return diagnostics;
}


function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
	const argumentsCheckDiagnostics: vscode.Diagnostic[] = [];

	for (const applyRange of scriptParser.GetScriptApplyRanges(document)) {
		try {
			const info = getPatternApply(document, applyRange);
			if (info === undefined) {
				continue;
			}

			for (const diagnostic of checkArgumentsSet(document, info)) {
				argumentsCheckDiagnostics.push(diagnostic);
			}
		} catch (e) {
			console.error(`Got error: ${e}`);
		}
	}

	collection.clear();
	collection.set(document.uri, argumentsCheckDiagnostics);
}


export async function activate(context: vscode.ExtensionContext) {
	console.log("Activate ...");

	console.log("Register CodeLens provider...");

	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			"*",
			new CodelensProvider()
		)
	);

	console.log("Register CodeLens provider... [ok]");

	console.log("Register Hover provider ...");

	vscode.languages.registerHoverProvider(
		"*",
		new HoverProvider(),
	);

	console.log("Register Hover provider ... [ok]");

	console.log("Register commands ...");

	vscode.commands.registerCommand(
		"structurizr-templates.showScriptDefinition",
		(scriptPath: string) => openFileInNewTab(scriptPath),
	);

	console.log("Register commands ... [ok]")

	console.log("Register diagnostics ...");

	const collection = vscode.languages.createDiagnosticCollection("structurizr-templates.diagnostics");

	if (vscode.window.activeTextEditor) {
		updateDiagnostics(vscode.window.activeTextEditor.document, collection);
	}

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(document => {
			updateDiagnostics(document, collection);
		})
	);

	console.log("Register diagnostics ... [ok]");

	console.log("Register completion provider ...");

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			"*",
			new CompletionProvider(),
		)
	);

	console.log("Register completion provider ... [ok]");

	console.log("Activate ... [ok]");
}

export function deactivate() {
	console.log("Deactivate ...");
	console.log("Deactivate ... [ok]");
}
