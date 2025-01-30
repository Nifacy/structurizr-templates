import * as fs from "fs"
import * as path from "path"


export interface PatternInfo {
    scriptPath: string;
    docs: string;
    params?: string[];
};


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
        params: infoJsonData["params"],
    };
}
