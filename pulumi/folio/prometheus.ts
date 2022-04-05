import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";

import { Resource } from "@pulumi/pulumi";
import { PrometheusResources } from "./classes/PrometheusResources";

export module deploy {
    export function namespaceAndHelmChart(
        name: string,
        cluster: eks.Cluster,
        dependsOn?: Resource[]): PrometheusResources {

        const namespace = new k8s.core.v1.Namespace(name, {},
            {
                provider: cluster.provider,
                dependsOn: dependsOn
            });

        const prometheus = new k8s.helm.v3.Release(name,
            {
                namespace: namespace.id,
                chart: "prometheus",
                version: "15.7.1",
                name: name,
                repositoryOpts: { repo: "https://prometheus-community.github.io/helm-charts" },
                // To customize
                // values: {
                // },
            }, {
            provider: cluster.provider,
            dependsOn: namespace
        });

        return new PrometheusResources(namespace, prometheus);
    }
}
