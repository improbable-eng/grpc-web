#!/usr/bin/env bash
set -e

VERSION=${1}
if [ -z ${VERSION} ]; then
  echo "VERSION not set"
  exit 1
fi

if [[ `git status --porcelain` ]]; then
  echo "There are pending changes, refusing to release."
  exit 1
fi

read -p "Release v${VERSION}? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Building standalone artifact"
    npm run lib:build

    echo "Staring npm publish"
    npm publish

    echo "Creating Github release branch release/v${VERSION}"
    git checkout -b release/v${VERSION}
    git add .
    git commit -m "Release ${VERSION}"
    git tag v${VERSION}
    git push origin --tags

    echo "All done!"
fi
