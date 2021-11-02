import pulumi
from pulumi_aws import config, iam
from tags import standard_tags
import json

## EKS Cluster Role

eks_role = iam.Role(
    "folio-eks-iam-role",
    assume_role_policy=json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Principal": {"Service": "eks.amazonaws.com"},
                    "Effect": "Allow",
                    "Sid": "",
                }
            ],
        }
    ),
    tags=standard_tags("folio-eks-iam-role"),
)

iam.RolePolicyAttachment(
    "folio-eks-service-policy-attachment",
    role=eks_role.id,
    policy_arn="arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
)


iam.RolePolicyAttachment(
    "folio-eks-cluster-policy-attachment",
    role=eks_role.id,
    policy_arn="arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
)

## Ec2 NodeGroup Role
# Allow members of the group to temporarily assume another role via the Secure Token Service (STS).
ec2_role = iam.Role(
    "folio-ec2-nodegroup-iam-role",
    assume_role_policy=json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Principal": {"Service": "ec2.amazonaws.com"},
                    "Effect": "Allow",
                    "Sid": "",
                }
            ],
        }
    ),
    tags=standard_tags("folio-ec2-nodegroup-iam-role")
)

iam.RolePolicyAttachment(
    "folio-eks-workernode-policy-attachment",
    role=ec2_role.id,
    policy_arn="arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
)

iam.RolePolicyAttachment(
    "folio-eks-cni-policy-attachment",
    role=ec2_role.id,
    policy_arn="arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
)

iam.RolePolicyAttachment(
    "folio-ec2-container-ro-policy-attachment",
    role=ec2_role.id,
    policy_arn="arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
)