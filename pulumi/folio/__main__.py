"""An AWS Python Pulumi program"""

import iam
import vpc
import utils
import pulumi
import pulumi_random
import pulumi_kubernetes as k8s
from pulumi_aws import eks, s3

## EKS Cluster

#####
# I am using `pulumi.ResourceOptions(parent)` a lot to control flow order and make sure that a
# resource waits until the underlying dependencies are ready.
#####

eks_cluster = eks.Cluster(
    "folio-eks-cluster",
    role_arn=iam.eks_role.arn,
    tags={
        "Name": "folio-eks-cluster",
        "Service": "FOLIO",
        "Environment": "dev",
        "Owner": "CTA",
        "Product": "FOLIO",
        "Accounting": "cubl-folio",
        "DataClassification/Compliance": "standard",
    },
    vpc_config=eks.ClusterVpcConfigArgs(
        # See also [Cluster VPC considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html)
        public_access_cidrs=["0.0.0.0/0"],
        # TODO See also [Amazon EKS security group considerations](https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html)
        security_group_ids=[vpc.eks_security_group.id],
        # Creates a subnet and ec2 routeTableAssociate in each AZ in the region
        subnet_ids=vpc.subnet_ids,
    ),
    version="1.21",
)

eks_node_group = eks.NodeGroup(
    "folio-eks-nodegroup",
    cluster_name=eks_cluster.name,
    node_group_name="folio-eks-nodegroup",
    node_role_arn=iam.ec2_role.arn,
    subnet_ids=vpc.subnet_ids,
    tags={
        "Name": "folio-eks-nodes",
        "Service": "FOLIO",
        "Environment": "dev",
        "Owner": "CTA",
        "Product": "FOLIO",
        "Accounting": "cubl-folio",
        "DataClassification/Compliance": "standard",
    },
    instance_types=["t3.large"],
    scaling_config=eks.NodeGroupScalingConfigArgs(
        desired_size=3,
        max_size=4,
        min_size=1,
    ),
)

pulumi.export("cluster-name", eks_cluster.name)
pulumi.export("kubeconfig", utils.generate_kube_config(eks_cluster))