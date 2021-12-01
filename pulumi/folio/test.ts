import { expect } from "chai";
import { describe } from "mocha";
import * as folio from "./folio";

// To run these tests do `npm test` on the command line.

describe("When preparing modules for deployment", () => {
    it("should create a valid module list for a release", async () => {
         const moduleList: Array<string> = [
            'okapi',
            'mod-users',
            'mod-permissions',
            'mod-authtoken',
            'mod-login',
            'mod-configuration' ];

         const release = "R3-2021";

         const result = await folio.prepare.moduleList(moduleList, release);

         expect(result.length).to.equal(moduleList.length);

    });
      
  });