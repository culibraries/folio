"use strict";
exports.__esModule = true;
exports.FolioModule = void 0;
/**
 * Represents a FOLIO module and any details specific to its deployment
 */
var FolioModule = /** @class */ (function () {
    function FolioModule(name, version, enableModule, tenantId, okapiUrl, containerRepository) {
        this.name = name;
        this.version = version;
        this.enableModule = enableModule;
        this.tenantId = tenantId;
        this.okapiUrl = okapiUrl;
        this.containerRepository = containerRepository;
        // Handle any special memory configurations for modules here.
        if (name.startsWith("okapi")) {
            this.limitsMemory = "2000Mi";
            this.requestsMemory = "500Mi";
        }
        else if (name.startsWith("mod-agreements")) {
            // It has been noticed that with the defaults from the folio-helm chart
            // mod-agreements is often OOM killed.
            this.limitsMemory = "1500Mi";
            this.requestsMemory = "500Mi";
        }
        else if (name.startsWith("mod-permissions")) {
            this.limitsMemory = "1500Mi";
            this.requestsMemory = "500Mi";
        }
        else if (name.startsWith("mod-inventory-storage")) {
            // mod-inventory storage will crash with OOM during data import if its
            // memory limit isn't increased.
            this.limitsMemory = "1500Mi";
            this.requestsMemory = "500Mi";
        }
        else {
            this.limitsMemory = "512Mi";
            this.requestsMemory = "400Mi";
        }
    }
    return FolioModule;
}());
exports.FolioModule = FolioModule;
