import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	console.log("Activate ...");
	console.log("Activate ... [ok]");
}

export function deactivate() {
	console.log("Deactivate ...");
	console.log("Deactivate ... [ok]");
}
