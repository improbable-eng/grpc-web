#!/bin/bash

export NVM_DIR="/home/circleci/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.33.5/install.sh | bash
$NVM_DIR/nvm.sh
nvm install
