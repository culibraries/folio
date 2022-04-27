import * as eks from "@pulumi/eks";

import { Namespace } from "@pulumi/kubernetes/core/v1/namespace";
import { Resource } from "@pulumi/pulumi/resource";
import { DynamicSecret } from "../interfaces/DynamicSecret";

export interface SecretArgs {
    name: string,
    labels: any,
    cluster: eks.Cluster,
    namespace: Namespace,
    data: DynamicSecret,
    dependsOn: Resource[]
}
