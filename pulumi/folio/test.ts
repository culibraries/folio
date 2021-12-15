import { expect } from "chai";
import { describe } from "mocha";
import { FolioDeployment } from "./classes/FolioDeployment";
import { FolioModule } from "./classes/FolioModule";
import * as folio from "./folio";

// To run these tests do `npm test` on the command line.

describe("When preparing modules for deployment", () => {
     it("should parse yaml for a release", () => {
          const moduleListResult: Array<any> = folio.prepare.modulesForRelease("./releases/R2-2021.yaml");
          expect(moduleListResult.length).to.be.greaterThan(0);
          expect(moduleListResult[0]).to.have.property("id");
     });

     it("should parse name and version", () => {
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
