import { expect } from "chai";
import { describe } from "mocha";
import { FolioModule } from "./classes/FolioModule";
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
         const moduleListResult:Array<FolioModule> = await folio.prepare.moduleList(moduleList, release);

         expect(moduleListResult.length).to.equal(moduleList.length);

         // Check a module name.
         let m:FolioModule = moduleListResult[0];
         expect(m.name).to.equal(moduleList[0]);

         // Make sure the version resembles a version string without getting too elaborate
         // with the regex (it checks for two periods).
         const matchResult = m.version.match(/\./g);
         expect(matchResult).is.not.null;
         expect(matchResult!.length).is.equal(2);
    });
  });