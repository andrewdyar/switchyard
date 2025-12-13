<p align="center">
  <a href="https://www.switchyard.com">
    <img alt="Switchyard" src="https://user-images.githubusercontent.com/7554214/153162406-bf8fd16f-aa98-4604-b87b-e13ab4baf604.png" width="100" />
  </a>
</p>
<h1 align="center">
  create-switchyard-app
</h1>

<h4 align="center">
  <a href="https://docs.switchyard.com">Documentation</a> |
  <a href="https://www.switchyard.com">Website</a>
</h4>

<p align="center">
An open source composable commerce engine built for developers.
</p>
<p align="center">
  <a href="https://github.com/switchyard/medusa/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Switchyard is released under the MIT license." />
  </a>
  <a href="https://circleci.com/gh/switchyard/medusa">
    <img src="https://circleci.com/gh/switchyard/medusa.svg?style=shield" alt="Current CircleCI build status." />
  </a>
  <a href="https://github.com/switchyard/medusa/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=switchyard">
    <img src="https://img.shields.io/twitter/follow/switchyard.svg?label=Follow%20@switchyard" alt="Follow @switchyard" />
  </a>
</p>

## Overview

Using this NPX command, you can setup a Switchyard backend and admin along with a PostgreSQL database in simple steps.

---

## Usage

Run the following command in your terminal:

```bash
npx create-switchyard-app@latest
```

Then, answer the prompted questions to setup your PostgreSQL database and Switchyard project. Once the setup is done, the Switchyard admin dashboard will open in your default browser.

### Options

| Option             | Description                                           | Default value                                        |
|--------------------|-------------------------------------------------------|------------------------------------------------------|
| `--repo-url <url>` | Create Switchyard project from a different repository URL | `https://github.com/switchyard/medusa-starter-default` |
| `--seed`           | Using this option seeds the database with demo data   | false                                                |
