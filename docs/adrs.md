# Architecture Decision Records

## 002 - Law as a Branch in a single FOLIO instance

* Status: [accepted]
* Deciders: CU FOLIO Priorities and Planning Council (PPC)
* Date: 2021-09-23

### Decision Outcome

EBSCO reports that we cannot have two catalogs with two sets of patron authentication methods go into one EDS instance. It only works with one catalog and one SAML SSO authentication method to authenticate patrons. That being the case, we are moving forward with sharing an instance of FOLIO with Law. Law will be a library in our configuration of FOLIO. As we share access to most purchased e-resources, we are moving to sharing the EBSCO KB/backend tools and a single EZProxy instance. We will be able to scope to Law resources. There will be some challenges associated with users and circulation policies but these seem to be something we can overcome. We will work on merging Law’s bibliographic and other records at the appropriate time. We also need to  investigate our current EZProxy contract with OCLC and better understand how to combine proxy instances.

-----------

## 001 - Maintaining Infrastructure as Code

* Status: accepted
* Deciders: James Fuller, Steve Ellis
* Date: 2021-10-22

### Context and Problem Statement

We need to create kubernetes infrastructure using AWS resources to support FOLIO and then deploy FOLIO containers into that infrastructure. Ideally the process would be repeatable, version controlled, automateable, testable, and not dependant on a single person (shared state).

### Decision Drivers

* Required manual steps and gaps in current ansible code
* Need for repeatable FOLIO instances to support Data Migration, FOLIO upgrade testing, infrastructure optimization, and sandbox efforts.
* CI/CD goal for infrastructure, including testing.
* Desire to improve FOLIO community support for kubernetes deployments.

### Considered Options

* Rancher
* Ansible
* Helm
* Pulumi
* Terraform
* Cloudformation

### Decision Outcome

Chosen option: Pulumi and Helm, because it seems like a modern and flexible set of tools that we can work with openly and make avaiable to others in the FOLIO community.

### Pros and Cons of the Options

#### Rancher

* Good, because we are already using it on the team
* Bad, because it is domain specific and not easy to maintain in code.

#### Ansible

* Good, because we are already using it on the team
* Bad, because doesn't share state between local developer machines, it assumes that state is known via the target which is not true for Helm.

#### Terraform

* Good, because it is provider agnostic
* Good, because it works well for IaC principles
* Bad, because it requires the use of a custom programming language (HCL)

#### Cloudformation

* Good, because it works well for IaC principles
* Good, because it is AWS' native tool
* Bad, because it requires the use of a custom programming language (CF)
* Bad, because it is not always up to date with the AWS APIs

#### Pulumi

* Good, because it is provider agnostic
* Good, because it works well for IaC principles
* Good, because it uses general programming languages
* Good, because there is a growing OSS community.
* Good, because it is always up to date with the AWS APIs using the [AWS Native Provider](https://www.pulumi.com/registry/packages/aws-native/)

#### Helm

* Good, because defacto standard for package management in Kubernetes
* Good, because there is some support for Helm Charts in the FOLIO community. The scratch environments are deployed using [FOLIO Helm Charts](https://github.com/folio-org/folio-helm)

### Links

* [FOLIO Helm Charts](https://github.com/folio-org/folio-helm)

-----------

```md
## [Template - short title of solved problem and solution]

* Status: [proposed | rejected | accepted | deprecated | … | superseded by [0005-newSolution](0005-newSolution.md)] <!-- optional -->
* Deciders: [list everyone involved in the decision] <!-- optional -->
* Date: [YYYY-MM-DD when the decision was last updated] <!-- optional -->

### Context and Problem Statement

[Describe the context and problem statement, e.g., in free form using two to three sentences. You may want to articulate the problem in form of a question.]

### Decision Drivers <!-- optional -->

* [driver 1, e.g., a force, facing concern, …]
* [driver 2, e.g., a force, facing concern, …]
* … <!-- numbers of drivers can vary -->

### Considered Options

* [option 1]
* [option 2]
* … <!-- numbers of options can vary -->

### Decision Outcome

Chosen option: "[option 1]", because [justification. e.g., only option, which meets k.o. criterion decision driver | which resolves force force | … | comes out best (see below)].

#### Positive Consequences <!-- optional -->

* [e.g., improvement of quality attribute satisfaction, follow-up decisions required, …]
* …

#### Negative Consequences <!-- optional -->

* [e.g., compromising quality attribute, follow-up decisions required, …]
* …

### Pros and Cons of the Options <!-- optional -->

#### [option 1]

[example | description | pointer to more information | …] <!-- optional -->

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* … <!-- numbers of pros and cons can vary -->

#### [option 2]

[example | description | pointer to more information | …] <!-- optional -->

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* … <!-- numbers of pros and cons can vary -->

### Links <!-- optional -->

* <!-- example: Refined by [ADR-0005](0005-example.md) -->
* <!-- example: Related to GitHub issue culibraries/folio#42 -->
* <!-- numbers of links can vary -->
```
