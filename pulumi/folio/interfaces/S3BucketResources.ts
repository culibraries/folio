import * as aws from "@pulumi/aws";

export interface BucketResources {
    bucket: aws.s3.Bucket;
    bucketPolicy: aws.s3.BucketPolicy;
}
