/**
 * Represents a FOLIO module and any details specific to its deployment
 */
export class FolioModule {
    name: string;

    version: string;

    enableModule: boolean;

    tenantId: string;

    loadSampleData: boolean;

    loadReferenceData: boolean;

    okapiUrl: string;

    /**
     * May be the same as the deployment, but can also be different depending
     * on the module's needs.
     */
    containerRepository: string;

    constructor(name: string,
        version: string,
        enableModule: boolean,
        tenantId: string,
        loadSampleData: boolean,
        loadReferenceData: boolean,
        okapiUrl: string,
        containerRepository: string) {
        this.name = name;
        this.version = version;
        this.enableModule = enableModule;
        this.tenantId = tenantId;
        this.loadSampleData = loadSampleData;
        this.loadReferenceData = loadReferenceData;
        this.okapiUrl = okapiUrl;
        this.containerRepository = containerRepository;
    }
}
