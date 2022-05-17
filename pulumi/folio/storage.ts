import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { BucketResources } from "./interfaces/S3BucketResources";
import { DataExportStorageArgs } from "./interfaces/DataExportStorageArgs";

export module deploy {
    export function s3BucketForDataExport(args: DataExportStorageArgs): BucketResources {
        const bucket = new aws.s3.Bucket(args.name, {
            tags: { "Name": args.name, ...args.tags }
        }, {
            dependsOn: args.dependsOn
        });

        const policyForIamUser = pulumi.interpolate`{
            "Version": "2012-10-17",
            "Statement":[
                {
                    "Effect": "Allow",
                    "Principal": {
                    "AWS": [ "${args.awsAccountId.apply(id => `arn:aws:iam::${id}:user/${args.iamUserId}`)}" ]
                },
            "Action": "s3:*",
            "Resource": "${bucket.arn.apply(arn => `${arn}`)}"
        }]}`;

        const bucketPolicy = new aws.s3.BucketPolicy(`${args.name}-policy`, {
            bucket: bucket.bucket,
            policy: policyForIamUser
        }, {
            dependsOn: [bucket]
        });

        return { bucket: bucket, bucketPolicy: bucketPolicy };
    }
}
