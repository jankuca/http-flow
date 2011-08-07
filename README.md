# HTTP Flow

HTTP Flow is a simple **reverse proxy** written in JavaScript that runs on [Node.js](http://www.nodejs.org/). Its main purpose is allowing us to have more than one web application running on one port (usually the port 80).

## Key features

- Maps HTTP requests to other applications
- Multiple domains per application
- Works awesomely with [node-git-deployer](https://github.com/jankuca/node-git-deployer)

## Directory structure

You need to have the applications handled by this proxy structured in the following directory structure.

This proxy is meant to handle applications managed with GIT. Therefore, the directory structure mirrors the repositories (repository/branch/).

    apps/
      first-app/
        master/
          .proxyinfo.json
        version-2/
          .proxyinfo.json
        .ports.json
      second-app/
        master/
          .proxyinfo.json
        version-2/
          .proxyinfo.json
        .ports.json
      third-app/
        master/
          .proxyinfo.json
        version-2/
          .proxyinfo.json
        .ports.json

> Note: Only meta information about the applications are required to have this structure. You can place your actual apps anywhere you want.

## Meta information files

There are several files required for the proxy to work properly.

### .ports.json

Considering that each application listens on its own port, we need to have a way to tell the proxy which application listens on which port.

    {
      "ports": {
        "master": 1102,
        "version-2": 1103
      }
    }

### .proxyinfo.json

Each application version/branch (second-level directory) has to include a `.proxyinfo.json` file that tells the proxy which hostnames/domains the particular version reserves.

    {
      "hostnames": [
        "www.example.com",
        "www.example-2.com"
      ]
    }

Now let's say that you want to automatically map versions/branches to subdomains such as `(version).example.com`. To do just that, use the `{{version}}` variable:

    "{{version}}.example.com"

When the router walks the directory structure, it fills in the current version name.

## Installation

    git clone git://...(URL of this repository)...
    cd http-flow
    git submodule update --init --recursive
    node proxy.js --appdir=/var/apps