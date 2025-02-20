import * as vscode from "vscode";
import * as fs from "fs"

import * as pluginParser from "./parser";
import * as pattern from "./pattern"


interface PatternApplyInfo {
	range: vscode.Range;
	pluginApplyInfo: pluginParser.PluginApplyInfo;
	patternInfo: pattern.PatternInfo;
};


interface UnpackedParameter {
	argumentName: pluginParser.ArgumentName;
	optional: boolean;
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
	const rawPluginApplyText = document.getText(applyRange);
	const pluginApplyInfo = pluginParser.ParsePluginApplyInfo(rawPluginApplyText);

	if (!pattern.IsPattern(workspaceFilePath, pluginApplyInfo.name)) {
		return undefined;
	}

	return {
		range: applyRange,
		pluginApplyInfo: pluginApplyInfo,
		patternInfo: pattern.GetPatternInfo(workspaceFilePath, pluginApplyInfo.name),
	};
}


function getDefinedIndexes(name: string, argNames: pluginParser.ArgumentName[]): number[] {
	const definedIndexes: number[] = [];

	for (const argName of argNames) {
        if (typeof argName === "string") {
            continue;
        }

        if (argName.array === name) {
            if (!definedIndexes.includes(argName.index)) {
				definedIndexes.push(argName.index);
			}
        }
    }

    return definedIndexes;
}


function unpackParams(
	params: pattern.Parameter[],
	args: pluginParser.ArgumentName[]
): UnpackedParameter[] {
	const result: UnpackedParameter[] = [];

	for (const param of params) {
		if ((param as pattern.Field).optional !== undefined) {
			const singledField = param as pattern.Field;

			result.push({
				argumentName: singledField.name,
				optional: singledField.optional,
			});
			continue;
		}
	
		const fieldGroup = param as pattern.FieldGroup;
		for (const index of getDefinedIndexes(fieldGroup.name, args)) {
			for (const field of fieldGroup.fields) {
				result.push({
					argumentName: {
						array: param.name,
						index: index,
						field: field.name,
					},
					optional: field.optional,
				});
			}
		}
	}

	return result;
}


function dumpPluginArgumentName(name: pluginParser.ArgumentName): string {
	if (typeof name === "string") {
		return name;
	}
	return `${name.array}.${name.index}.${name.field}`;
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

		for (const applyRange of pluginParser.GetPluginApplyRanges(document)) {
			try {
				const info = getPatternApply(document, applyRange);
				if (info === undefined) {
					continue;
				}

				const goToDefinitionCommand: vscode.Command = {
					title: "Go to pattern definition",
					command: "structurizr-templates.showPluginDefinition",
					arguments: [info.patternInfo.pluginName],
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
		for (const applyRange of pluginParser.GetPluginApplyRanges(document)) {
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

		for (const applyRange of pluginParser.GetPluginApplyRanges(document)) {
			if (!applyRange.contains(position)) {
				continue;
			}

			const info = getPatternApply(document, applyRange);
			if (info === undefined) {
				continue;
			}

			if (info.pluginApplyInfo.unfinishedArgumet !== undefined) {
				const arg = info.pluginApplyInfo.unfinishedArgumet;

				const args = (info.pluginApplyInfo.arguments ?? []).map(arg => arg.name);
				const params = info.patternInfo.params ?? [];
				const totalArgs = unpackParams(params, args).map(p => p.argumentName);

				const dumpedArgs = args.map(dumpPluginArgumentName);
				const dumpedRequiredArgs = totalArgs.map(dumpPluginArgumentName);

				const missingParams = dumpedRequiredArgs.filter(arg => !dumpedArgs.includes(arg));
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
	const pluginText = document.getText(patternApplyInfo.range);
	const pluginOffset = document.offsetAt(patternApplyInfo.range.start);

	const startIndex = pluginText.indexOf(extraArgument);
	const endIndex = startIndex + extraArgument.length;

	const startPosition = document.positionAt(pluginOffset + startIndex);
	const endPosition = document.positionAt(pluginOffset + endIndex);

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
	const pluginOffset = document.offsetAt(patternApplyInfo.range.start);
	const pluginText = document.getText(patternApplyInfo.range);

	const startHeaderPosition = document.positionAt(pluginOffset);
	const endHeaderPosition = document.positionAt(pluginOffset + pluginText.indexOf(" "));

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

	for (const arg of patternApplyInfo.pluginApplyInfo.arguments) {
		console.log(`- ${arg.name}`);
	}

	const args = patternApplyInfo.pluginApplyInfo.arguments ?? [];
	const argNames = args.map(arg => arg.name);
	const params = patternApplyInfo.patternInfo.params ?? [];

	const unpackedParams = unpackParams(params, argNames);
	const requiredArgs = unpackedParams.filter(p => !p.optional).map(p => p.argumentName);
	const totalArgs = unpackedParams.map(p => p.argumentName);

	console.log("required args:")
	console.log(requiredArgs);

	console.log("total args:");
	console.log(totalArgs);

	const dumpedArgNames = argNames.map(dumpPluginArgumentName);
	const dumpedRequiredArgs = requiredArgs.map(dumpPluginArgumentName);
	const dumpedTotalArgs = totalArgs.map(dumpPluginArgumentName);

	const extraArgs = dumpedArgNames.filter(arg => !dumpedTotalArgs.includes(arg));
	const missingArguments = dumpedRequiredArgs.filter(arg => !dumpedArgNames.includes(arg));

	for (const extraArg of extraArgs) {
		diagnostics.push(createRequiredArgumentError(document, patternApplyInfo, extraArg));
	}

	for (const missingParam of missingArguments) {
		diagnostics.push(createMissingParameterError(document, patternApplyInfo, missingParam));
	}

	return diagnostics;
}


function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
	const argumentsCheckDiagnostics: vscode.Diagnostic[] = [];

	for (const applyRange of pluginParser.GetPluginApplyRanges(document)) {
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
		"structurizr-templates.showPluginDefinition",
		(pluginName: string) => openFileInNewTab(pluginName),
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
