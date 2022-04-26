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

export function moduleExistsInList(name: string, moduleList: FolioModule[]): boolean {
    for (const module of moduleList) {
        if (module.name === name) {
            return true;
        }
    }
    return false;
}

/**
 * Returns a db custer identifier that is stack-specific unless the stack is a "prod oriented" stack
 * meaning that it uses production data. In that case the id return is not qualified by
 * the stack name.
 */
export function getStackDbIdentifier() {
    const stack = pulumi.getStack();
    // NOTE Blue will probably become a prod stack eventually but if that is the case it should
    // be created as a completely new stack deployment.
    const id:string = "folio-pg";
    if (usesProdData(stack)) return id;
    return id + "-" + stack;
}

/**
 * Returns a search custer identifier that is stack-specific unless the stack is a "prod oriented" stack
 * meaning that it uses production data. In that case the id return is not qualified by
 * the stack name.
 */
export function getStackSearchIdentifier() {
    const stack = pulumi.getStack();
    // NOTE Blue will probably become a prod stack eventually but if that is the case it should
    // be created as a completely new stack.
    const id:string = "folio-search";
    if (usesProdData(stack)) return id;
    return id + "-" + stack;
}

function usesProdData(stack: string) {
    // Add or remove from this list depending on needs.
    // NOTE For now only the "dev" stack has non-qualified data sources
    // (data sources that don't have a suffix). This allows for multiple stacks
    // to share prod data sources.
    const prod = ["dev"];
    return prod.includes(stack);
}
