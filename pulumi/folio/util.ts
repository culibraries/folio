import * as pulumi from "@pulumi/pulumi";
import { FolioModule } from "./classes/FolioModule";

export function base64Encode(source: pulumi.Output<string>): pulumi.Output<string> {
    return source.apply(v => Buffer.from(v).toString("base64"));
}

export function getModuleByName(name: string, moduleList: FolioModule[]): FolioModule {
    for (const module of moduleList) {
        if (module.name === name) {
            return module;
        }
    }
    throw new Error("Module not found");
}
