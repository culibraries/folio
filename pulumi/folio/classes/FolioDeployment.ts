import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";

/**
 * Represents details about a FOLIO kubernetes deployment, including the cluster
 * to deploy to, the namespace, the tenant, etc.
 */
export class FolioDeployment {
    tenantId: string;

    deploymentConfigurationFilePath: string;

    loadReferenceData: boolean;

    loadSampleData: boolean;

    cluster: eks.Cluster;

    namespace: k8s.core.v1.Namespace;

    okapiUrl: string;

    containerRepository: string;

    constructor(tenantId: string,
        releaseFilePath: string,
        loadReferenceData: boolean,
        loadSampleData: boolean,
        cluster: eks.Cluster,
        namespace: k8s.core.v1.Namespace,
        okapiUrl: string,
        containerRepository: string
        ) {
            this.tenantId = tenantId;
            this.deploymentConfigurationFilePath = releaseFilePath;
            this.loadReferenceData = loadReferenceData;
            this.loadSampleData = loadSampleData;
            this.cluster = cluster;
            this.namespace = namespace;
            this.okapiUrl = okapiUrl;
            this.containerRepository = containerRepository;
    }
}
