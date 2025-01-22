import * as vscode from "vscode";

interface ScriptArgument {
	name: string;
	value: string;
}

interface ScriptInfo {
	path: string;
	arguments: ScriptArgument[];
}


const scriptExp = new RegExp(/^!script (?<path>\S+|(?:['"][^'"]+['"]))\s*(?:\{(?<params>[\s\S]*?)\})?$/gm);
const paramExp = new RegExp(/^\s*(?<name>\S+)\s+(?<value>(?:['"][^'"\n]+['"])|\S+)\s*$/g);
const stringBracketsExp = new RegExp(/^['"]|['"]$/g);
const figureBracketsExp = new RegExp(/^\{|\}$/g);

function parseScriptArgument(s: string): ScriptArgument {
    const matches = s.matchAll(paramExp);

	for (let match of matches) {
		if (!match.groups) {
			throw Error("Unexpected empty group");
		}

        return {
            name: match.groups.name,
            value: match.groups.value.replace(stringBracketsExp, ""),
        }
    }

    throw Error(`Can't parse parameter: '${s}'`);
}


function splitByLines(text: string): string[] {
    let lines = text.replace(figureBracketsExp, "").split(/\r?\n/);
    lines = lines.map(line => line.trim());
    lines = lines.filter(line => line !== "");
    return lines;
}


function parseScriptInfo(text: string): ScriptInfo {
    const matches = text.matchAll(scriptExp);
    for (let match of matches) {
		if (!match.groups) {
			throw Error("Unexpected empty group");
		}

        let scriptArgs: ScriptArgument[] = [];
        if (match.groups?.params) {
            const lines = splitByLines(match.groups.params);
            scriptArgs = lines.map(parseScriptArgument);
        }

        return {
            path: match.groups.path.replace(stringBracketsExp, ""),
            arguments: scriptArgs,
        }
    }

    throw Error(`Can't parse script: '${text}'`);
}


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

		console.log("provide code lens:");
		console.log("text: ", [text]);

		while ((matches = regex.exec(text)) !== null) {
			try {
				console.log("Matches: ", matches);

				// const startLine = document.lineAt(document.positionAt(matches.index).line);
				// const startCharIndex = startLine.text.indexOf(matches[0]);
				// const startPos = new vscode.Position(startLine.lineNumber, startCharIndex);

				const startPos = document.positionAt(matches.index);
				const endPos = document.positionAt(matches.index + matches[0].length);

				// const range = document.getWordRangeAtPosition(startPos, new RegExp(regex));
				const range = new vscode.Range(startPos, endPos);

				console.log("Range: ", range);
				console.log("Range: ", [
					[range?.start.line, range?.start.character],
					[range?.end.line, range?.end.character],
				]);

				if (range) {
					const data: ScriptInfo = parseScriptInfo(matches[0]);
					const x = new vscode.CodeLens(
						range,
						{
							title: "Codelens provided by sample extension",
							tooltip: "Tooltip provided by sample extension",
							command: "structurizr-templates.codelensAction",
							arguments: [data],
						}
					);
					this.codeLenses.push(x);
				}
			} catch(e) {
				console.log("Got error: ", e);
			}
		}
		return this.codeLenses;
	}

	public resolveCodeLens(codeLens: vscode.CodeLens, _token: vscode.CancellationToken) {
		// codeLens.command = {
		// 	title: "Codelens provided by sample extension",
		// 	tooltip: "Tooltip provided by sample extension",
		// 	command: "structurizr-templates.codelensAction",
		// };
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

	vscode.commands.registerCommand("structurizr-templates.codelensAction", (scriptInfo: ScriptInfo) => {
		// vscode.window.showInformationMessage(`CodeLens action clicked scriptInfo=${scriptInfo}`);
		console.log("Script Info: ", scriptInfo);
	});

	console.log("Register commands ... [ok]")

	console.log("Activate ... [ok]");
}

export function deactivate() {
	console.log("Deactivate ...");
	console.log("Deactivate ... [ok]");
}
