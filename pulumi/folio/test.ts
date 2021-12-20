import { expect } from "chai";
import { describe } from "mocha";
import * as folio from "./folio";

// To run these tests do `npm test` on the command line.

describe("When preparing modules for deployment", () => {
     it("should parse yaml for a release", () => {
          const moduleListResult: Array<any> = folio.prepare.modulesForRelease("./deployments/R2-2021.yaml");
          expect(moduleListResult.length).to.be.greaterThan(0);
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

     it("should set value for createSuperuser in deployment config file and read it", () => {
          let configFile = "./deployments/R2-2021.yaml"
          folio.prepare.setCreateSuperuser(true, configFile);
          var shouldCreate:boolean = folio.prepare.shouldCreateSuperuser(configFile);
          expect(shouldCreate).equals(true);
          folio.prepare.setCreateSuperuser(false, configFile);
          var shouldNotCreate:boolean = folio.prepare.shouldCreateSuperuser(configFile);
          expect(shouldNotCreate).equals(false);
     });
});
