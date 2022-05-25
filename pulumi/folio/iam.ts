import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export module deploy {
    export function awsRoleWithManagedPolicyAttachments
        (name: string, tags: object, managedPolicyArns: Array<string>, service: string): aws.iam.Role {
        const role = new aws.iam.Role(name, {
            tags: { "Name": name, ...tags },
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
                Service: service,
            }),
        });

        let counter = 0;
        for (const policy of managedPolicyArns) {
            new aws.iam.RolePolicyAttachment(`${name}-policy-${counter++}`,
                { policyArn: policy, role: role },
            );
        }

        return role;
    }

    export function awsBindRoleToInstanceProfile(name: string, role: aws.iam.Role) {
        return new aws.iam.InstanceProfile(name, { role: role });
    }

    export function awsRBACRole(name: string, tags: object): aws.iam.Role {
        // See https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
        // for an explanation of the role policy. See also for how to get the various identifiers:
        // https://docs.aws.amazon.com/general/latest/gr/acct-identifiers.html
        // For why we need all this to be defined in one variable and 'apply' and 'interpolate' see:
        // https://www.pulumi.com/docs/intro/concepts/inputs-outputs/. If the strings that use the secret
        // are combined into a single variable (here 'policy'), pulumi no longer complains.
        const config = new pulumi.Config();
        const policy = pulumi.interpolate`{
            "Version": "2012-10-17",
            "Statement":[
                {
                    "Sid": "AllowAssumeRoleStatement",
                    "Effect": "Allow",
                    "Principal": {
                    "AWS": [ "${config.getSecret("awsAccountId")?.apply(v => `arn:aws:iam::${v}:root`)}" ]
                },
            "Action": "sts:AssumeRole"
        }]}`;
        return new aws.iam.Role(`${name}`, {
            assumeRolePolicy: policy,
            tags: {
                "clusterAccess": `${name}-usr`, ...tags
            },
        });

    }
}
