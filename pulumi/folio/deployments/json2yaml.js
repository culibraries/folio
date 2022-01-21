"use strict";
exports.__esModule = true;
var fs = require("fs");
var release = fs.readFileSync('./R2-2021-install.json', 'utf8');
console.log("JSON input:\n");
console.log(release);
var objs = JSON.parse(release);
var yamlString = "modules:\n";
for (var _i = 0, objs_1 = objs; _i < objs_1.length; _i++) {
    var obj = objs_1[_i];
    yamlString += "  - " + obj.id + "\n";
}
console.log("YAML output:\n");
console.log(yamlString);
fs.writeFileSync('./R2-2021-modules.yaml', yamlString);
