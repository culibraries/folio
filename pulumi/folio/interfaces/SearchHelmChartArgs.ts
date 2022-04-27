import * as eks from "@pulumi/eks";

import { Namespace } from "@pulumi/kubernetes/core/v1/namespace";
import { Resource, Output } from "@pulumi/pulumi";
import { SecretArgs } from "../interfaces/SecretArgs";

export interface SearchHelmChartArgs {
    name: string,
    cluster: eks.Cluster,
    namespace: Namespace,
    domain: Output<string>,
    secret: SecretArgs,
    dependsOn?: Resource[]
}
