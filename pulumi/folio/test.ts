import { expect } from "chai";
import { describe } from "mocha";
import { FolioModule } from "./classes/FolioModule";
import * as folio from "./folio";

// To run these tests do `npm test` on the command line.

describe("When preparing modules for deployment", () => {
    it("should create a valid module list for a release", () => {
         const moduleListResult:Array<FolioModule> = folio.prepare.moduleList('./releases/R2-2021.json');

         expect(moduleListResult.length).to.be.greaterThan(0);

         // Make sure the version resembles a version string without getting too elaborate
         // with the regex (it checks for two periods).
         const m:FolioModule = moduleListResult[0];
         const matchResult = m.version.match(/\./g);
         expect(matchResult).is.not.null; // Will be null if no match.
         expect(matchResult!.length).is.equal(2);
    });
  });
