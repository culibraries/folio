/**
 * Represents a FOLIO module and any details specific to its deployment
 */
export class FolioModule {
    name: string;

    version: string;

    enableModule: boolean;

    tenantId: string;

    okapiUrl: string;

    limitsMemory: string;

    requestsMemory: string;

    /**
     * May be the same as the deployment, but can also be different depending
     * on the module's needs.
     */
    containerRepository: string;

    constructor(name: string,
        version: string,
        enableModule: boolean,
        tenantId: string,
        okapiUrl: string,
        containerRepository: string) {
        this.name = name;
        this.version = version;
        this.enableModule = enableModule;
        this.tenantId = tenantId;
        this.okapiUrl = okapiUrl;
        this.containerRepository = containerRepository;

        // Handle any special memory configurations for modules here.
        if (name.startsWith("okapi")) {
            this.limitsMemory = "2000Mi"
            this.requestsMemory = "500Mi";
        } else if (name.startsWith("mod-agreements")) {
            // It has been noticed that with the defaults from the folio-helm chart
            // mod-agreements is often OOM killed.
            this.limitsMemory = "1500Mi"
            this.requestsMemory = "500Mi";
        } else if (name.startsWith("mod-permissions")) {
            this.limitsMemory = "1500Mi"
            this.requestsMemory = "500Mi";
        } else {
            this.limitsMemory = "512Mi"
            this.requestsMemory = "400Mi";
        }
    }
}
