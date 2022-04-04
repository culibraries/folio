import * as k8s from "@pulumi/kubernetes";

export class PrometheusResources {
    namespace: k8s.core.v1.Namespace;
    helmRelease: k8s.helm.v3.Release;

    constructor(namespace: k8s.core.v1.Namespace,
        helmRelease: k8s.helm.v3.Release) {
        this.namespace = namespace;
        this.helmRelease = helmRelease;
    }
}
