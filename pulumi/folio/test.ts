import { expect } from "chai";
import { describe } from "mocha";
import * as folio from "./folio";

// To run these tests do `npm test` on the command line.

describe("When preparing modules for deployment", () => {
     it("should parse json for a release and contain expected properties", () => {
          const moduleListResult: Array<any> = folio.prepare.modulesForRelease("./deployments/R2-2021.json");
          expect(moduleListResult.length).to.be.greaterThan(0);
          expect(moduleListResult[0].id).to.exist;
          expect(moduleListResult[0].action).to.exist;
     });

     it("should parse name and version from a module id string", () => {
          const parsed = folio.prepare.parseModuleNameAndId("mod-awesome-1.0.1");
          expect(parsed).to.have.property("name");
          expect(parsed).to.have.property("version");

          // Make sure the version resembles a version string without getting too elaborate
          // with the regex (it checks for two periods).
          const matchResult = parsed.version.match(/\./g);
          expect(matchResult).is.not.null; // Will be null if no match.
          expect(matchResult!.length).is.equal(2);
     });
});
