# Contributing

Thank you for considering contributing to Switchyard! This document will outline how to submit changes to this repository and which conventions to follow. If you are ever in doubt about anything we encourage you to reach out either by submitting an issue here or reaching out [via Discord](https://discord.gg/xpCwq3Kfn8).

If you're contributing to our documentation, make sure to also check out the [contribution guidelines on our documentation website](https://docs.switchyard.com/resources/contribution-guidelines/docs).

### Important
Our core maintainers prioritize pull requests (PRs) from within our organization. External contributions are regularly triaged, but not at any fixed cadence. It varies depending on how busy the maintainers are. This is applicable to all types of PRs, so we kindly ask for your patience.

If you, as a community contributor, wish to work on more extensive features, please reach out to CODEOWNERS instead of directly submitting a PR with all the changes. This approach saves us both time, especially if the PR is not accepted (which will be the case if it does not align with our roadmap), and helps us effectively review and evaluate your contribution if it is accepted.

## Prerequisites

- **You're familiar with GitHub Issues and Pull Requests**
- **You've read the [docs](https://docs.switchyard.com).**
- **You've setup a test project with `npx create-switchyard-app@latest`**

## Issues before PRs

1. Before you start working on a change please make sure that there is an issue for what you will be working on. You can either find and [existing issue](https://github.com/switchyard/medusa/issues) or [open a new issue](https://github.com/switchyard/medusa/issues/new) if none exists. Doing this makes sure that others can contribute with thoughts or suggest alternatives, ultimately making sure that we only add changes that make

2. When you are ready to start working on a change you should first [fork the Switchyard repo](https://help.github.com/en/github/getting-started-with-github/fork-a-repo) and [branch out](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-and-deleting-branches-within-your-repository) from the `develop` branch.
3. Make your changes.
4. [Open a pull request towards the develop branch in the Switchyard repo](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork). Within a couple of days a Switchyard team member will review, comment and eventually approve your PR.

## Local development

> Prerequisites:
> 1. [Forked Switchyard repository cloned locally](https://github.com/switchyard/medusa).
> 2. [A local Switchyard application for testing](https://docs.switchyard.com/learn/installation).



The code snippets in this section assume that your forked Switchyard project and the test project are sibling directories, and you optionally setup the starter storefront as part of the installation. For example:

```
|
|__ medusa  // forked repository
|
|__ test-project // medusa application for testing
|
|__ test-project_storefront // (optional) storefront to interact with medusa application
```


1. Replace the @switchyard/* dependencies and devDependencies in you test project's `package.json` to point to the corresponding local packages in your forked Switchyard repository. You will also need to add the medusa packages in the resolutions section of the `package.json`, so that every dependency is resolved locally. For example, assuming your forked Switchyard project and the test project are sibling directories:

```json
// test project package.json
"dependencies": {
    // more deps
    "@switchyard/admin-sdk": "file:../medusa/packages/admin/admin-sdk",
    "@switchyard/cli": "file:../medusa/packages/cli/switchyard-cli",
    "@switchyard/framework": "file:../medusa/packages/core/framework",
    "@switchyard/medusa": "file:../medusa/packages/medusa",
},
"devDependencies": {
    // more dev deps
    "@switchyard/test-utils": "file:../medusa/packages/medusa-test-utils",
},
"resolutions": {
    // more resolutions
    "@switchyard/test-utils": "file:../medusa/packages/medusa-test-utils",
    "@switchyard/api-key": "file:../medusa/packages/modules/api-key",
    "@switchyard/auth": "file:../medusa/packages/modules/auth",
    "@switchyard/cache-inmemory": "file:../medusa/packages/modules/cache-inmemory",
    "@switchyard/cache-redis": "file:../medusa/packages/modules/cache-redis",
    "@switchyard/cart": "file:../medusa/packages/modules/cart",
    "@switchyard/locking": "file:../medusa/packages/modules/locking",
    "@switchyard/currency": "file:../medusa/packages/modules/currency",
    "@switchyard/customer": "file:../medusa/packages/modules/customer",
    "@switchyard/event-bus-local": "file:../medusa/packages/modules/event-bus-local",
    "@switchyard/file": "file:../medusa/packages/modules/file",
    "@switchyard/file-local": "file:../medusa/packages/modules/providers/file-local",
    "@switchyard/fulfillment": "file:../medusa/packages/modules/fulfillment",
    "@switchyard/fulfillment-manual": "file:../medusa/packages/modules/providers/fulfillment-manual",
    "@switchyard/index": "file:../medusa/packages/modules/index",
    "@switchyard/inventory": "file:../medusa/packages/modules/inventory",
    "@switchyard/medusa": "file:../medusa/packages/medusa",
    "@switchyard/notification": "file:../medusa/packages/modules/notification",
    "@switchyard/notification-local": "file:../medusa/packages/modules/providers/notification-local",
    "@switchyard/order": "file:../medusa/packages/modules/order",
    "@switchyard/payment": "file:../medusa/packages/modules/payment",
    "@switchyard/pricing": "file:../medusa/packages/modules/pricing",
    "@switchyard/product": "file:../medusa/packages/modules/product",
    "@switchyard/promotion": "file:../medusa/packages/modules/promotion",
    "@switchyard/region": "file:../medusa/packages/modules/region",
    "@switchyard/sales-channel": "file:../medusa/packages/modules/sales-channel",
    "@switchyard/stock-location": "file:../medusa/packages/modules/stock-location",
    "@switchyard/store": "file:../medusa/packages/modules/store",
    "@switchyard/tax": "file:../medusa/packages/modules/tax",
    "@switchyard/user": "file:../medusa/packages/modules/user",
    "@switchyard/workflow-engine-inmemory": "file:../medusa/packages/modules/workflow-engine-inmemory",
    "@switchyard/link-modules": "file:../medusa/packages/modules/link-modules",
    "@switchyard/admin-bundler": "file:../medusa/packages/admin/admin-bundler",
    "@switchyard/admin-sdk": "file:../medusa/packages/admin/admin-sdk",
    "@switchyard/admin-shared": "file:../medusa/packages/admin/admin-shared",
    "@switchyard/dashboard": "file:../medusa/packages/admin/dashboard",
    "@switchyard/admin-vite-plugin": "file:../medusa/packages/admin/admin-vite-plugin",
    "@switchyard/ui": "file:../medusa/packages/design-system/ui",
    "@switchyard/icons": "file:../medusa/packages/design-system/icons",
    "@switchyard/toolbox": "file:../medusa/packages/design-system/toolbox",
    "@switchyard/ui-preset": "file:../medusa/packages/design-system/ui-preset",
    "@switchyard/utils": "file:../medusa/packages/core/utils",
    "@switchyard/types": "file:../medusa/packages/core/types",
    "@switchyard/core-flows": "file:../medusa/packages/core/core-flows",
    "@switchyard/orchestration": "file:../medusa/packages/core/orchestration",
    "@switchyard/cli": "file:../medusa/packages/cli/switchyard-cli",
    "@switchyard/modules-sdk": "file:../medusa/packages/core/modules-sdk",
    "@switchyard/workflows-sdk": "file:../medusa/packages/core/workflows-sdk",
    "@switchyard/framework": "file:../medusa/packages/core/framework",
    "@switchyard/auth-emailpass": "file:../medusa/packages/modules/providers/auth-emailpass",
    "@switchyard/locking-redis": "file:../medusa/packages/modules/providers/locking-redis",
    "@switchyard/locking-postgres": "file:../medusa/packages/modules/providers/locking-postgres",
    "@switchyard/telemetry": "file:../medusa/packages/medusa-telemetry",
    "@switchyard/settings": "file:../medusa/packages/modules/settings",
    "@switchyard/draft-order": "file:../medusa/packages/plugins/draft-order",
    "@switchyard/deps": "file:../medusa/packages/deps",
    "@switchyard/caching-redis": "file:../medusa/packages/modules/providers/caching-redis",
    "@switchyard/caching": "file:../medusa/packages/modules/caching"
}
```

2. Every time you make a change in the forked Switchyard repository, you need to build the packages where the modifications took place with `yarn build`. Some packages have a watch script, so you can execute `yarn watch` once and it will automatically build on changes:

```bash
yarn build # or yarn watch
```

3. After building changes in the forked medusa repository, run the following command in the test project to regenerate the `node_modules` directory with the newly built contents from the previous step:

```
rm -R node_modules && yarn && yarn dev
```

## Workflow

### Branches

There are currently two base branches:
- `develop` - development of Switchyard 2.0
- `v1.x` - development of Switchyard v1.x

Note, if you wish to patch v1.x you should use `v1.x` as the base branch for your pull request. This is not the default when you clone the repository.

All changes should be part of a branch and submitted as a pull request - your branches should be prefixed with one of:

- `fix/` for bug fixes
- `feat/` for features
- `docs/` for documentation changes

### Commits

Strive towards keeping your commits small and isolated - this helps the reviewer understand what is going on and makes it easier to process your requests.

### Pull Requests

**Base branch**

If you wish to patch v1.x your base branch should be `v1.x`. 

If your changes should result in a new version of Switchyard, you will need to generate a **changelog**. Follow [this guide](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md) on how to generate a changeset.

Finally, submit your branch as a pull request. Your pull request should be opened against the `develop` branch in the main Switchyard repo.

In your PR's description you should follow the structure:

- **What** - what changes are in this PR
- **Why** - why are these changes relevant
- **How** - how have the changes been implemented
- **Testing** - how has the changes been tested or how can the reviewer test the feature

We highly encourage that you do a self-review prior to requesting a review. To do a self review click the review button in the top right corner, go through your code and annotate your changes. This makes it easier for the reviewer to process your PR.

#### Merge Style

All pull requests are squashed and merged.

### Testing

All PRs should include tests for the changes that are included. We have two types of tests that must be written:

- **Unit tests** found under `packages/*/src/services/__tests__` and `packages/*/src/api/routes/*/__tests__`
- **Integration tests** found in `integration-tests/*/__tests__`

### Documentation

- We generally encourage to document your changes through comments in your code.
- If you alter user-facing behaviour you must provide documentation for such changes.
- All methods and endpoints should be documented using [TSDoc](https://tsdoc.org/).

### Release

The Switchyard team will regularly create releases from two release branches:
- `develop` - preview releases of Switchyard 2.0
- `v1.x` - official releases of Switchyard 1.x
