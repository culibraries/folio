# Acquisitions: Finance

## Hierarchy

The hierarchy of the finance structure in FOLIO is:

> Fiscal Years → Ledgers → Funds → Budgets

Our Structure in FOLIO will be:

> Fiscal Year→ Ledger (by ACQ unit) → Fund (by ACQ unit) → Budget (by ACQ unit)

For example: FY2022 → Arts & Sciences Startup Funds Ledger (CU Boulder) → 7burge (CU Boulder) → 6176.92 + Groups: Japanese & Korean; Arts & Humanities; 3rd Year

### Fiscal Year*

Fiscal Year is the financial year. It may be determined by the University or might be determined by internal dates. For example, in Sierra the fiscal year differs slightly from the University dates because campus fiscal close activities extend into July and we may not be able to close the fiscal year in Sierra until we reconcile with campus close activities.

### Ledgers

Ledgers are generally modeled after the CU Boulder Fund Accounting structure, with some exceptions such as the Arts & Sciences Faculty Startup funds and Library Materials funds which have a significant number of related funds to warrant their own ledgers.

### Funds

Funds must be associated with a specific speedtype. Most funds and speedtypes should have a one-to-one relationship, with the exception of Library Materials and Arts & Sciences Faculty funds.

### Budgets

Budgets are allocation amounts plus the parameters and rules, if any, about the allocation, encumbrances, or expenditures.

### Groups

- Funds can be grouped into Groups.
- Groups can cross ledgers and pull together funds from multiple ledgers
- Funds can have more than one Group.

### Acquisition Units

Ledgers, Funds, and Budgets can be identified as pertaining to an Acquisition Unit. For our current purposes, we will establish a CU Boulder Acquisition Unit in the event that Law’s budget and financial structure is also incorporate into our instance of FOLIO.

Identifying ledgers, funds, and budgets to specific Acquisition Units prevents users from outside the Acquisition Unit from editing, expending, or altering finance data. CU Boulder and Law would be able to view each others ledgers and funds, but could not apply a fund accidentally to a purchase order line, for example.

## Translation from Sierra

### Hierarchy in Sierra

The FOLIO Finance structure translates well from the existing Sierra fund structure.

The existing Sierra Fund Structure is:

Hierarchies → Groups → Funds → Allocations

- Hierarchies = Ledgers
- Funds = Funds
- Allocations = Allocations

### Other notes

- Groups from Sierra will be incorporated into FOLIO, but have greater functionality in FOLIO.
- Sierra only shows the current fiscal year. FOLIO has the ability to show current, previous, and future fiscal years.
- Funds include External Account fields. The External Account field is for the Speedtype
