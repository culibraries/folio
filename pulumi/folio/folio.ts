import * as request from "superagent";
import { FolioModule } from "./classes/FolioModule";

export module prepare {
    /**
     * Prepare a list of folio modules which can be used to deploy.
     * @param moduleNames A list of module names to deploy.
     * @param release The release in the form of a "quarterly" release.
     * @returns A list of FolioModule objects.
     */
    export async function moduleList(moduleNames: Array<string>, release: string): Promise<FolioModule[]> {
        var folioModules: FolioModule[] = new Array<FolioModule>();
        console.log(`Attempting to prepare ${moduleNames.length} modules for deployment`);

        const releaseModules = await getModulesForRelease(release);
        console.log(`Got ${releaseModules.length} modules in platform-complete for ${release} release`);

        for (const moduleName of moduleNames) {
            console.log(`Trying to get module with the name: ${moduleName}`);
            const releaseModule = getModuleByNameFromRelease(moduleName, releaseModules);
            console.log(`Got module: ${releaseModule.id}`); 
            var m = new FolioModule(moduleName, "");
            folioModules.push(m);
        }

        return folioModules;
    }

    async function getModulesForRelease(release: string): Promise<Array<any>> {
        var endpoint = `https://raw.githubusercontent.com/folio-org/platform-complete/${release}/install.json`;
        console.log(`Fetching folio module list from endpoint: ${endpoint}`);
        const response = await request.get(endpoint);
        if (response.statusCode == 200) {
            return JSON.parse(response.text);
        }
        throw new Error(`Unexpected response from github while getting modules for release: ${response.statusCode}`);
    }

    function getModuleByNameFromRelease(moduleName: string, releaseModules: Array<any>): any {
        for (const m of releaseModules) {
            if (m.id.startsWith(moduleName)) {
                return m;
            }
        }
        throw new Error(`No module found with the name: ${moduleName}`);
    }
}

export module deploy {
    /**
     * Deploys the provided list of folio modules.
     * @param toDeploy The modules to deploy.
     */
    export function modules(toDeploy: Array<FolioModule>) {
        console.log(`Deploying modules: ${toDeploy.length}`);
    }
}

