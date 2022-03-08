import * as fs from 'fs';
import * as YAML from 'yaml';

const release = fs.readFileSync('./../deployments/R2-2021.yaml', 'utf8');
console.log("YAML input:\n")
console.log(release);
const mods = YAML.parse(release).modules;
let jsonString = "[";
for (const mod of mods) {
    jsonString += '{ "id": "' + mod + '", "action": "enable" },\n';
}
// Remove last comma and insert a closing bracket.
jsonString = jsonString.replace(/,\s*$/, "]");
console.log("JSON output:\n");
console.log(jsonString);
fs.writeFileSync('./../deployments/R2-2021.json', jsonString);
