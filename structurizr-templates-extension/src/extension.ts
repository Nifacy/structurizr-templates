import * as vscode from "vscode";
import * as path from "path"
import * as fs from "fs"

import * as scriptFinder from "./scriptFinder";
import * as pattern from "./pattern"


interface ScriptUsageContext {
	patternInfo: pattern.PatternInfo;
	range: vscode.Range;
}


async function openFileInNewTab(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
		throw Error(`The file ${filePath} does not exist.`)
    }

	const openedDocument = await vscode.workspace.openTextDocument(filePath);
	await vscode.window.showTextDocument(openedDocument, vscode.ViewColumn.One);
}


const scriptUsageExp: RegExp = /(!script\s+(?:["']([^"'\n]+)["']|\S+)(?:\s*\{[\s\S]*?\})?)/g;


function getScriptUsages(document: vscode.TextDocument): ScriptUsageContext[] {
	const regex = new RegExp(scriptUsageExp);
	const text = document.getText();
	let matches;

	const scriptUsages: ScriptUsageContext[] = [];

	while ((matches = regex.exec(text)) !== null) {
		const startPos = document.positionAt(matches.index);
		const endPos = document.positionAt(matches.index + matches[0].length);
		const range = new vscode.Range(startPos, endPos);

		const workspaceDirectory = path.dirname(document.fileName);
		const scriptInfo = scriptFinder.ParseScriptInfo(matches[0]);

		if (!pattern.IsPatternScript(workspaceDirectory, scriptInfo)) {
			continue;
		}

		if (range) {
			scriptUsages.push({
				patternInfo: pattern.GetPatternInfo(workspaceDirectory, scriptInfo),
				range: range,
			});
		}
	}
	return scriptUsages;
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

		try {
			for (const scriptUsageContext of getScriptUsages(document)) {
				const goToDefinitionCommand: vscode.Command = {
					title: "Go to pattern definition",
					command: "structurizr-templates.showScriptDefinition",
					arguments: [scriptUsageContext.patternInfo.scriptPath],
				}
	
				this.codeLenses.push(new vscode.CodeLens(scriptUsageContext.range, goToDefinitionCommand));
			}
		} catch (e) {
			console.log("Got error: ", e);
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
		for (const scriptUsageContext of getScriptUsages(document)) {
			if (scriptUsageContext.range.contains(position)) {
				const markdownContent = new vscode.MarkdownString(scriptUsageContext.patternInfo.docs);
				return new vscode.Hover(markdownContent, scriptUsageContext.range);
			}
		}
		return undefined;
	}
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

	vscode.commands.registerCommand("structurizr-templates.codelensAction", (scriptInfo: scriptFinder.ScriptInfo) => {
		console.log("Script Info: ", scriptInfo);
	});

	vscode.commands.registerCommand(
		"structurizr-templates.showScriptDefinition",
		(scriptPath: string) => openFileInNewTab(scriptPath),
	);

	console.log("Register commands ... [ok]")

	console.log("Activate ... [ok]");
}

export function deactivate() {
	console.log("Deactivate ...");
	console.log("Deactivate ... [ok]");
}
