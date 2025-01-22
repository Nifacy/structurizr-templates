const scriptExp = new RegExp(/^!script (?<path>\S+|(?:['"][^'"]+['"]))\s*(?:\{(?<params>[\s\S]*?)\})?$/gm);
const paramExp = new RegExp(/^\s*(?<name>\S+)\s+(?<value>(?:['"][^'"\n]+['"])|\S+)\s*$/g);
const stringBracketsExp = new RegExp(/^['"]|['"]$/g);
const figureBracketsExp = new RegExp(/^\{|\}$/g);


export interface ScriptArgument {
	name: string;
	value: string;
}

export interface ScriptInfo {
	path: string;
	arguments: ScriptArgument[];
}


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


export function ParseScriptInfo(text: string): ScriptInfo {
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
