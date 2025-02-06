import * as fs from "fs"
import * as path from "path"


export interface ParameterArray {
    name: string;
    elementFields: string[];
}

export type PatternParameter = string | ParameterArray

export interface PatternInfo {
    scriptPath: string;
    docs: string;
    params?: PatternParameter[];
};


function parseParameter(value: any): PatternParameter {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "object" && value !== null) {
        // TODO: add fields' set validation
        if (value["name"] !== undefined && value["fields"] !== undefined) {
            return {
                name: value["name"],
                elementFields: value["fields"],
            }
        }
    }

    throw Error(`Unable to parse parameter: ${value}`)
}


export function IsPattern(workspaceFilePath: string, scriptPath: string) {
    const workspaceDirectory = path.dirname(workspaceFilePath);
    const fullScriptPath = path.join(workspaceDirectory, scriptPath);

    if (!fs.existsSync(fullScriptPath)) {
        return false;
    }

    const parentDir = path.dirname(fullScriptPath);
    const infoFilePath = path.join(parentDir, "info.json");

    if (!fs.existsSync(infoFilePath)) {
        return false;
    }

    return true;
}


export function GetPatternInfo(workspaceFilePath: string, scriptPath: string): PatternInfo {
    const workspaceDirectory = path.dirname(workspaceFilePath);
    const fullScriptPath = path.join(workspaceDirectory, scriptPath);
    const parentDir = path.dirname(fullScriptPath);
    const infoFilePath = path.join(parentDir, "info.json");

    const infoJsonContent = fs.readFileSync(infoFilePath, "utf8");
    const infoJsonData = JSON.parse(infoJsonContent);

    return {
        scriptPath: fullScriptPath,
        docs: infoJsonData["doc"],
        params: infoJsonData["params"]?.map(parseParameter),
    };
}
