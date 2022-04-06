/**
 * Represents details about a FOLIO kubernetes deployment.
 */
export class FolioDeployment {
    tenantId: string;

    deploymentConfigurationFilePath: string;

    okapiUrl: string;

    containerRepository: string;

    constructor(tenantId: string,
        releaseFilePath: string,
        okapiUrl: string,
        containerRepository: string
    ) {
        this.tenantId = tenantId;
        this.deploymentConfigurationFilePath = releaseFilePath;
        this.okapiUrl = okapiUrl;
        this.containerRepository = containerRepository;
    }
}
