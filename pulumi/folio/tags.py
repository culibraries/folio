import pulumi

def standard_tags(name):
    return {
        "Name": name,
        "Service": "FOLIO",
        "Environment": pulumi.get_stack(),
        "Owner": "CTA",
        "Product": "FOLIO",
        "Accounting": "cubl-folio",
        "DataClassification/Compliance": "standard",
    }