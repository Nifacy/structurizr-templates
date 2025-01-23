import * as vscode from "vscode";
import * as path from "path"

import * as scriptFinder from "./scriptFinder";
import * as pattern from "./pattern"


class CodelensProvider implements vscode.CodeLensProvider {

	private codeLenses: vscode.CodeLens[] = [];
	private regex: RegExp;
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {
		this.regex = /(!script\s+(?:["']([^"'\n]+)["']|\S+)(?:\s*\{[\s\S]*?\})?)/g;

		vscode.workspace.onDidChangeConfiguration((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		this.codeLenses = [];
		const regex = new RegExp(this.regex);
		const text = document.getText();
		let matches;

		while ((matches = regex.exec(text)) !== null) {
			try {
				const startPos = document.positionAt(matches.index);
				const endPos = document.positionAt(matches.index + matches[0].length);
				const range = new vscode.Range(startPos, endPos);
				const scriptInfo = scriptFinder.ParseScriptInfo(matches[0]);
				const workspaceDirectory = path.dirname(document.fileName);

				if (!pattern.IsPatternScript(workspaceDirectory, scriptInfo)) {
					continue;
				}

				if (range) {
					const codeLensCommand: vscode.Command = {
						title: "Script Usage",
						tooltip: "Script Usage (tooltip)",
						command: "structurizr-templates.codelensAction",
						arguments: [scriptInfo],
					}

					this.codeLenses.push(new vscode.CodeLens(range, codeLensCommand));
				}
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

export function activate(context: vscode.ExtensionContext) {
	console.log("Activate ...");

	console.log("Register CodeLens provider...");

	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			"*",
			new CodelensProvider()
		)
	);

	console.log("Register CodeLens provider... [ok]");

	console.log("Register commands ...");

	vscode.commands.registerCommand("structurizr-templates.codelensAction", (scriptInfo: scriptFinder.ScriptInfo) => {
		console.log("Script Info: ", scriptInfo);
	});

	console.log("Register commands ... [ok]")

	console.log("Activate ... [ok]");
}

export function deactivate() {
	console.log("Deactivate ...");
	console.log("Deactivate ... [ok]");
}
