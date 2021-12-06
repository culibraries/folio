import * as pulumi from "@pulumi/pulumi";

export function base64Encode(source: pulumi.Output<string>): pulumi.Output<string> {
    return source.apply(v => Buffer.from(v).toString("base64"));
}