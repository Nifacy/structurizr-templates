import * as fs from "fs"
import * as path from "path"
import * as yaml from "js-yaml";


export interface Field {
    name: string;
    optional: boolean;
};


export interface FieldGroup {
    name: string;
    fields: Field[];
}

export type Parameter = Field | FieldGroup

export interface PatternInfo {
    scriptPath: string;
    docs: string;
    params?: Parameter[];
};


function parseSingleField(value: any): Field {
    if (typeof value === "string") {
        return {
            name: value,
            optional: false,
        };
    }

    if (typeof value === "object" && value !== null) {
        if (value["name"] !== undefined && value["optional"] !== undefined) {
            return {
                name: value["name"],
                optional: value["optional"],
            };
        }
    }

    throw Error(`Unable to parse argument: ${value}`);
}


function parseParameter(value: any): Parameter {
    // check if it is a fields' group
    if (typeof value === "object" && value !== null) {
        // TODO: add fields' set validation
        if (value["name"] !== undefined && value["fields"] !== undefined) {
            return {
                name: value["name"],
                fields: value["fields"].map(parseSingleField),
            };
        }
    }

    return parseSingleField(value);
}


export function IsPattern(workspaceFilePath: string, scriptPath: string) {
    const workspaceDirectory = path.dirname(workspaceFilePath);
    const fullScriptPath = path.join(workspaceDirectory, scriptPath);

    if (!fs.existsSync(fullScriptPath)) {
        return false;
    }

    const parentDir = path.dirname(fullScriptPath);
    const infoFilePath = path.join(parentDir, "info.yaml");

    if (!fs.existsSync(infoFilePath)) {
        return false;
    }

    return true;
}


export function GetPatternInfo(workspaceFilePath: string, scriptPath: string): PatternInfo {
    const workspaceDirectory = path.dirname(workspaceFilePath);
    const fullScriptPath = path.join(workspaceDirectory, scriptPath);
    const parentDir = path.dirname(fullScriptPath);
    const infoFilePath = path.join(parentDir, "info.yaml");

    const infoJsonContent = fs.readFileSync(infoFilePath, "utf8");
    const infoJsonData = yaml.load(infoJsonContent) as any;

    return {
        scriptPath: fullScriptPath,
        docs: infoJsonData["doc"],
        params: infoJsonData["params"]?.map(parseParameter),
    };
}
