import pulumi
from pulumi_aws import ec2, get_availability_zones
from tags import standard_tags

## VPC

name = "folio-eks-vpc"
vpc = ec2.Vpc(
    name,
    cidr_block="10.100.0.0/16",
    instance_tenancy="default",
    enable_dns_hostnames=True,
    enable_dns_support=True,
    tags=standard_tags(name)
)

name = "folio-public-vpc-ig"
igw = ec2.InternetGateway(
    name,
    vpc_id=vpc.id,
    tags=standard_tags(name)
)

# If a subnet's traffic is routed to a internet gateway it is public.

name = "folio-public-vpc-route-table"
eks_route_table = ec2.RouteTable(
    name,
    vpc_id=vpc.id,
    routes=[
        ec2.RouteTableRouteArgs(
            cidr_block="0.0.0.0/0",
            gateway_id=igw.id,
        )
    ],
    tags=standard_tags(name)
)

## Subnets, one public and one private for each AZ in a region.

# For the definition of public and private subnets see:
# https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html#vpc-subnet-basics

zones = get_availability_zones()
subnet_ids = []
private_subnet_ids = []

# Create the public subnets. Public subnets are public because they
# are associated with an InternetGateway.
for zone in zones.names:
    vpc_subnet = ec2.Subnet(
        f"folio-public-vpc-subnet-{zone}",
        assign_ipv6_address_on_creation=False,
        vpc_id=vpc.id,
        map_public_ip_on_launch=True,
        cidr_block=f"10.100.{len(subnet_ids)}.0/24",
        availability_zone=zone,
        tags=standard_tags(f"folio-public-sn-{zone}")
    )
    ec2.RouteTableAssociation(
        f"folio-public-vpc-route-table-assoc-{zone}",
        route_table_id=eks_route_table.id,
        subnet_id=vpc_subnet.id,
    )
    subnet_ids.append(vpc_subnet.id)

# Create the private subnets. Private subnets are private because
# they are NOT associated with an InternetGateway or other gateway.
for zone in zones.names:
    vpc_subnet = ec2.Subnet(
        f"folio-private-vpc-subnet-{zone}",
        assign_ipv6_address_on_creation=False,
        vpc_id=vpc.id,
        map_public_ip_on_launch=True,
        cidr_block=f"10.100.{len(subnet_ids)}.0/24",
        availability_zone=zone,
        tags=standard_tags(f"folio-private-sn-{zone}")
    )
    subnet_ids.append(vpc_subnet.id)
    private_subnet_ids.append(vpc_subnet.id)

## Security Group

name = "folio-eks-cluster-sg"
eks_security_group = ec2.SecurityGroup(
    name,
    vpc_id=vpc.id,
    description="Allow all HTTP(s) traffic to EKS Cluster",
    tags=standard_tags(name),
    ingress=[
        ec2.SecurityGroupIngressArgs(
            cidr_blocks=["0.0.0.0/0"],
            from_port=443,
            to_port=443,
            protocol="tcp",
            description="Allow pods to communicate with the cluster API Server.",
        ),
        ec2.SecurityGroupIngressArgs(
            cidr_blocks=["0.0.0.0/0"],
            from_port=80,
            to_port=80,
            protocol="tcp",
            description="Allow internet access to pods",
        ),
    ],
)