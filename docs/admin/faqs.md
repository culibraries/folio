# Frequently Asked Questions

* Why are the bib numbers different between FOLIO and Sierra?
  * Check Digits. Sierra uses Check Digits as an internal validation of bib numbers [III Docs](https://knowledge.exlibrisgroup.com/Alma/Implementation_and_Migration/Migration_Guides_and_Tutorials/Extracting_Records_from_Millennium_and_Sierra_(III)_for_Migration_to_Alma). We are stripping the check digit from `hrid` during migration since it will cause a problem matching Sierra's holdings records, which contain no check digit.
