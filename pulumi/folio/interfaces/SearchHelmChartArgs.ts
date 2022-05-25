import * as eks from "@pulumi/eks";

import { Namespace } from "@pulumi/kubernetes/core/v1/namespace";
import { Resource, Output } from "@pulumi/pulumi";
import { SecretArgs } from "../interfaces/SecretArgs";

export interface SearchHelmChartArgs {
    name: string,
    cluster: eks.Cluster,
    namespace: Namespace,
    domainUrl: Output<string>,
    secretArgs: SecretArgs,
    dependsOn?: Resource[]
}
