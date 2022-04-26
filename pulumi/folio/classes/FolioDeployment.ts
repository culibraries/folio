import { FolioModule } from "./FolioModule";
import * as fs from 'fs';

/**
 * Represents details about a FOLIO kubernetes deployment.
 */
export class FolioDeployment {
    tenantId: string;

    deploymentConfigurationFilePath: string;

    okapiUrl: string;

    containerRepository: string;

    modules: FolioModule[];

    constructor(tenantId: string,
        releaseFilePath: string,
        okapiUrl: string,
        containerRepository: string
    ) {
        this.tenantId = tenantId;
        this.deploymentConfigurationFilePath = releaseFilePath;
        this.okapiUrl = okapiUrl;
        this.containerRepository = containerRepository;
        this.modules = new Array<FolioModule>();

        const releaseModules = FolioDeployment.modulesForRelease(releaseFilePath);

        for (const module of releaseModules) {

            const parsed = FolioDeployment.parseModuleNameAndId(module.id);

            if (module.action === "enable") {
                const m = new FolioModule(parsed.name,
                    parsed.version,
                    true,
                    tenantId,
                    okapiUrl,
                    containerRepository);
                this.modules.push(m);
            }
        }
    }

    static parseModuleNameAndId(moduleId: string): any {
        const versionStart = moduleId.lastIndexOf('-') + 1;
        const versionEnd = moduleId.length;
        const moduleVersion = moduleId.substring(versionStart, versionEnd);

        const nameStart = 0;
        const nameEnd = moduleId.lastIndexOf('-');
        const moduleName = moduleId.substring(nameStart, nameEnd);

        return { name: moduleName, version: moduleVersion };
    }

    static modulesForRelease(deploymentConfigFilePath: string): Array<any> {
        const release = fs.readFileSync(deploymentConfigFilePath, 'utf8');
        return JSON.parse(release);
    }
}
