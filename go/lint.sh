#!/bin/bash
# Script that checks the code for errors.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

function print_real_go_files {
    grep --files-without-match 'DO NOT EDIT!' $(find . -iname '*.go')
}

function check_no_documentation_changes {
  echo "- Running generate-docs.sh"
  output=$(./generate-docs.sh)
  if [[ $? -ne 0 ]]; then
    echo $output
    echo "ERROR: Failed to generate documentation."
    exit 1
  fi

  git diff --name-only | grep -q DOC.md
  if [[ $? -ne 1 ]]; then
    echo "ERROR: Documentation changes detected, please commit them."
    exit 1
  fi
}

function check_gofmt {
    echo "- Running gofmt"
    out=$(gofmt -l -w $(print_real_go_files))
    if [[ ! -z $out ]]; then
        echo "ERROR: gofmt changes detected, please commit them."
        exit 1
    fi
}

function goimports_all {
    echo "- Running goimports"
    ${GOBIN}/goimports -l -w $(print_real_go_files)
    if [[ $? -ne 0 ]]; then
        echo "ERROR: goimports changes detected, please commit them."
        exit 1
    fi
}

function govet_all {
    echo "- Running govet"
    go vet -all=true -tests=false ./...
    if [[ $? -ne 0 ]]; then
        echo "ERROR: govet errors detected, please commit/fix them."
        exit 1
    fi
}

check_no_documentation_changes
check_gofmt
goimports_all
govet_all
echo
