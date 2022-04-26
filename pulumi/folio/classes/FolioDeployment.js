"use strict";
exports.__esModule = true;
exports.FolioDeployment = void 0;
var FolioModule_1 = require("./FolioModule");
var fs = require("fs");
/**
 * Represents details about a FOLIO kubernetes deployment.
 */
var FolioDeployment = /** @class */ (function () {
    function FolioDeployment(tenantId, releaseFilePath, okapiUrl, containerRepository) {
        this.tenantId = tenantId;
        this.deploymentConfigurationFilePath = releaseFilePath;
        this.okapiUrl = okapiUrl;
        this.containerRepository = containerRepository;
        this.modules = new Array();
        var releaseModules = FolioDeployment.modulesForRelease(releaseFilePath);
        for (var _i = 0, releaseModules_1 = releaseModules; _i < releaseModules_1.length; _i++) {
            var module_1 = releaseModules_1[_i];
            var parsed = FolioDeployment.parseModuleNameAndId(module_1.id);
            if (module_1.action === "enable") {
                var m = new FolioModule_1.FolioModule(parsed.name, parsed.version, true, tenantId, okapiUrl, containerRepository);
                this.modules.push(m);
            }
        }
    }
    FolioDeployment.parseModuleNameAndId = function (moduleId) {
        var versionStart = moduleId.lastIndexOf('-') + 1;
        var versionEnd = moduleId.length;
        var moduleVersion = moduleId.substring(versionStart, versionEnd);
        var nameStart = 0;
        var nameEnd = moduleId.lastIndexOf('-');
        var moduleName = moduleId.substring(nameStart, nameEnd);
        return { name: moduleName, version: moduleVersion };
    };
    FolioDeployment.modulesForRelease = function (deploymentConfigFilePath) {
        var release = fs.readFileSync(deploymentConfigFilePath, 'utf8');
        return JSON.parse(release);
    };
    return FolioDeployment;
}());
exports.FolioDeployment = FolioDeployment;
