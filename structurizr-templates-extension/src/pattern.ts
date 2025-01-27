import * as fs from "fs"
import * as path from "path"
import * as scriptFinder from "./scriptFinder"


export interface PatternInfo {
    scriptPath: string;
    docs: string;
    params?: string[];
    args?: string[];
};


export function IsPatternScript(workspaceDirectory: string, scriptInfo: scriptFinder.ScriptInfo) {
    const fullScriptPath = path.join(workspaceDirectory, scriptInfo.path)

    if (!fs.existsSync(fullScriptPath)) {
        console.log(`'${fullScriptPath}' doesn't exist`);
        return false;
    }

    const parentDir = path.dirname(fullScriptPath);
    const infoFilePath = path.join(parentDir, "info.json");

    if (!fs.existsSync(infoFilePath)) {
        console.log(`'${infoFilePath}' doesn't exist`);
        return false;
    }

    return true;
}


export function GetPatternInfo(workspaceDirectory: string, scriptInfo: scriptFinder.ScriptInfo): PatternInfo {
    const fullScriptPath = path.join(workspaceDirectory, scriptInfo.path);
    const parentDir = path.dirname(fullScriptPath);
    const infoFilePath = path.join(parentDir, "info.json");

    const infoJsonContent = fs.readFileSync(infoFilePath, "utf8");
    const infoJsonData = JSON.parse(infoJsonContent);

    return {
        scriptPath: fullScriptPath,
        docs: infoJsonData["doc"],
        params: infoJsonData["params"],
        args: scriptInfo.arguments.map(arg => arg.name),
    };
}
