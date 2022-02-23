# Maintaining Infrastructure as Code

* Status: accepted
* Deciders: James Fuller, Steve Ellis
* Date: 2021-10-22

## Context and Problem Statement

We need to create kubernetes infrastructure using AWS resources to support FOLIO and then deploy FOLIO containers into that infrastructure. Ideally the process would be repeatable, version controlled, automateable, testable, and not dependant on a single person (shared state).

## Decision Drivers

* Required manual steps and gaps in current ansible code
* Need for repeatable FOLIO instances to support Data Migration, FOLIO upgrade testing, infrastructure optimization, and sandbox efforts.
* CI/CD goal for infrastructure, including testing.
* Desire to improve FOLIO community support for kubernetes deployments.

## Considered Options

* Rancher
* Ansible
* Helm
* Pulumi
* Terraform
* Cloudformation

## Decision Outcome

Chosen option: Pulumi and Helm, because it seems like a modern and flexible set of tools that we can work with openly and make avaiable to others in the FOLIO community.

## Pros and Cons of the Options

### Rancher

* Good, because we are already using it on the team
* Bad, because it is domain specific and not easy to maintain in code.

### Ansible

* Good, because we are already using it on the team
* Bad, because doesn't share state between local developer machines, it assumes that state is known via the target which is not true for Helm.

### Terraform

* Good, because it is provider agnostic
* Good, because it works well for IaC principles
* Bad, because it requires the use of a custom programming language (HCL)

### Cloudformation

* Good, because it works well for IaC principles
* Good, because it is AWS' native tool
* Bad, because it requires the use of a custom programming language (CF)
* Bad, because it is not always up to date with the AWS APIs

### Pulumi

* Good, because it is provider agnostic
* Good, because it works well for IaC principles
* Good, because it uses general programming languages
* Good, because there is a growing OSS community.
* Good, because it is always up to date with the AWS APIs using the [AWS Native Provider](https://www.pulumi.com/registry/packages/aws-native/)

### Helm

* Good, because defacto standard for package management in Kubernetes
* Good, because there is some support for Helm Charts in the FOLIO community. The scratch environments are deployed using [FOLIO Helm Charts](https://github.com/folio-org/folio-helm)

## Links

* [FOLIO Helm Charts](https://github.com/folio-org/folio-helm)
