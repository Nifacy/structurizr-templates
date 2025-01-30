import * as vscode from "vscode"


const SCRIPT_APPLY_EXPR = new RegExp(/(!script\s+(?:["']([^"'\n]+)["']|\S+)(?:\s*\{[\s\S]*?\})?)/g);
const SCRIPT_EXPR = new RegExp(/^!script (?<path>\S+|(?:['"][^'"]+['"]))\s*(?:\{(?<params>[\s\S]*?)\})?$/gm);
const PARAM_EXPR = new RegExp(/^\s*(?<name>\S+)\s+(?<value>(?:['"][^'"\n]+['"])|\S+)\s*$/g);
const UNFINISHED_PARAM_EXPR = new RegExp(/^\s*(?<name>\S+)\s*$/g);
const STRING_BRACKETS_EXPR = new RegExp(/^['"]|['"]$/g);
const FIGURE_BRACKETS_EXPR = new RegExp(/^\{|\}$/g);


export interface ScriptArgument {
    name: string;
    value: string;
}

export interface ScriptApplyInfo {
    path: string;
    arguments: ScriptArgument[];
    unfinishedArgumet?: string;
}


export function GetScriptApplyRanges(document: vscode.TextDocument): vscode.Range[] {
    const regex = new RegExp(SCRIPT_APPLY_EXPR);
    const text = document.getText();
    let matches;

    const ranges: vscode.Range[] = [];

    while ((matches = regex.exec(text)) !== null) {
        const startPos = document.positionAt(matches.index);
        const endPos = document.positionAt(matches.index + matches[0].length);
        const range = new vscode.Range(startPos, endPos);
        ranges.push(range);
    }

    return ranges;
}


function parseScriptArgument(s: string): ScriptArgument {
    const matches = s.matchAll(PARAM_EXPR);

    for (let match of matches) {
        if (!match.groups) {
            throw Error("Unexpected empty group");
        }

        return {
            name: match.groups.name,
            value: match.groups.value.replace(STRING_BRACKETS_EXPR, ""),
        }
    }

    throw Error(`Can't parse line: '${s}'`);
}


function parseUnfinishedScriptArgument(s: string): string {
    const matches = s.matchAll(UNFINISHED_PARAM_EXPR);

    for (let match of matches) {
        if (!match.groups) {
            throw Error("Unexpected empty group");
        }

        return match.groups.name;
    }

    throw Error(`Can't parse line: '${s}'`);
}


function splitByLines(text: string): string[] {
    let lines = text.replace(FIGURE_BRACKETS_EXPR, "").split(/\r?\n/);
    lines = lines.map(line => line.trim());
    lines = lines.filter(line => line !== "");
    return lines;
}


export function ParseScriptApplyInfo(text: string): ScriptApplyInfo {
    const matches = text.matchAll(SCRIPT_EXPR);
    let scriptPath: string | undefined = undefined;
    let scriptArgs: ScriptArgument[] = [];
    let unfinishedArgument: string | undefined = undefined;

    for (let match of matches) {
        if (!match.groups) {
            throw Error("Unexpected empty group");
        }

        scriptPath = match.groups.path.replace(STRING_BRACKETS_EXPR, "");

        if (match.groups?.params) {
            for (const line of splitByLines(match.groups.params)) {
                try {
                    const parsedArgument = parseScriptArgument(line);
                    scriptArgs.push(parsedArgument);
                } catch {
                    unfinishedArgument = parseUnfinishedScriptArgument(line);
                }
            }
        }

        return {
            path: scriptPath,
            arguments: scriptArgs,
            unfinishedArgumet: unfinishedArgument,
        };
    }

    throw Error(`Can't parse script: '${text}'`);
}
