import * as fs from 'fs';
import * as YAML from 'yaml';

const release = fs.readFileSync('./R2-2021-install.json', 'utf8');
console.log("JSON input:\n")
console.log(release);
const objs = JSON.parse(release);
let yamlString = "modules:\n";
for (const obj of objs) {
    yamlString += "  - " + obj.id + "\n"
}
console.log("YAML output:\n");
console.log(yamlString);
fs.writeFileSync('./R2-2021-modules.yaml', yamlString);
