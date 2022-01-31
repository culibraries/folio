"use strict";
exports.__esModule = true;
var fs = require("fs");
var YAML = require("yaml");
var release = fs.readFileSync('./../deployments/R2-2021.yaml', 'utf8');
console.log("YAML input:\n");
console.log(release);
var mods = YAML.parse(release).modules;
var jsonString = "[";
for (var _i = 0, mods_1 = mods; _i < mods_1.length; _i++) {
    var mod = mods_1[_i];
    jsonString += '{ "id": "' + mod + '", "action": "enable" },\n';
}
// Remove last comma and insert a closing bracket.
jsonString = jsonString.replace(/,\s*$/, "]");
console.log("JSON output:\n");
console.log(jsonString);
fs.writeFileSync('./../deployments/R2-2021.json', jsonString);
