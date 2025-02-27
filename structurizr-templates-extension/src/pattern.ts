import * as fs from "fs"
import * as path from "path"
import * as yaml from "js-yaml";
import { PatternLens } from "./patternLens";


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
    pluginName: string;
    docs: string;
    params?: Parameter[];
};


export function IsPattern(workspaceFilePath: string, pluginName: string) {
    const workspaceDirectory = path.dirname(workspaceFilePath);
    const infoDirectory = path.join(workspaceDirectory, "patterns-info");
    const infoFilePath = path.join(infoDirectory, `${pluginName}.yaml`);

    if (!fs.existsSync(infoFilePath)) {
        return false;
    }

    return true;
}


export async function GetPatternInfo(
    patternLens: PatternLens,
    workspaceFilePath: string,
    pluginName: string
): Promise<PatternInfo> {
    const workspaceDirectory = path.dirname(workspaceFilePath);
    const infoDirectory = path.join(workspaceDirectory, "patterns-info");
    const infoFilePath = path.join(infoDirectory, `${pluginName}.yaml`);

    const infoJsonContent = fs.readFileSync(infoFilePath, "utf8");
    const infoJsonData = yaml.load(infoJsonContent) as any;

    const patternParams = await patternLens.GetParams(workspaceFilePath, pluginName) as Parameter[];

    return {
        pluginName: pluginName,
        docs: infoJsonData["doc"],
        params: patternParams,
    };
}
