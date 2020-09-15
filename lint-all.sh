#!/bin/bash

echo "Linting go sources"
cd go && . ./lint.sh && cd ..

echo "Linting TypeScript sources"
npm run lint
