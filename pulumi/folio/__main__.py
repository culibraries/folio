"""An AWS Python Pulumi program"""

import iam
import vpc
import utils
import pulumi
import pulumi_random
import pulumi_kubernetes as k8s
import pulumi_aws as aws
from pulumi_aws import eks, s3
from tags import standard_tags

## EKS Cluster

cluster_name = "folio-eks-cluster"
eks_cluster = eks.Cluster(
    cluster_name,
    role_arn=iam.eks_role.arn,
    tags=standard_tags(cluster_name),
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

# TODO Should I only pass in the subnet ids of the _private_ subnet here?
# TODO Should I export these ips/ids?
name = "folio-eks-nodegroup"
tags = standard_tags(name)
cluster_name_tag_key = "kubernetes.io/cluster/" + cluster_name
tags[cluster_name_tag_key] = "owned"
eks_node_group = eks.NodeGroup(
    name,
    cluster_name=eks_cluster.name,
    node_group_name=name,
    node_role_arn=iam.ec2_role.arn,
    subnet_ids=vpc.subnet_ids,
    #subnet_ids=vpc.private_subnet_ids,
    tags=tags,
    instance_types=["t3.xlarge"],
    scaling_config=eks.NodeGroupScalingConfigArgs(
        desired_size=3,
        max_size=4,
        min_size=1,
    ),
)

## Add ons for the cluster

# https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
name = "folio-vpc-cni-add-on"
aws.eks.Addon(name,
    cluster_name=eks_cluster.name,
    addon_name="vpc-cni",
    tags=standard_tags(name)
    )

# https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html
name = "folio-coredns-add-on"
aws.eks.Addon(name,
    cluster_name=eks_cluster.name,
    addon_name="coredns",
    tags=standard_tags(name)
    )

# https://docs.aws.amazon.com/eks/latest/userguide/managing-kube-proxy.html
name = "folio-kube-proxy-add-on"
aws.eks.Addon(name,
    cluster_name=eks_cluster.name,
    addon_name="kube-proxy",
    tags=standard_tags(name)
    )

## Export kubeconfig and cluster name

pulumi.export("cluster-name", eks_cluster.name)
pulumi.export("kubeconfig", utils.generate_kube_config(eks_cluster))