import * as fs from "fs"
import * as path from "path"
import * as scriptFinder from "./scriptFinder"


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
