#!/bin/bash
# Script that checks the code for errors.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

function print_real_go_files {
    grep --files-without-match 'DO NOT EDIT!' $(find . -iname '*.go')
}

function generate_markdown {
    echo "Generating markdown using godocdown in..."
    oldpwd=$(pwd)
    for i in $(find . -iname 'doc.go'); do
        dir=${i%/*}
        echo "- $dir"
        cd ${dir}
        ${GOPATH}/bin/godocdown -heading=Title -o DOC.md
        ln -s DOC.md README.md 2> /dev/null # can fail
        cd ${oldpwd}
    done;

    git diff --name-only --exit-code | grep -q DOC.md
    if [[ $? -ne 1 ]]; then
      echo "ERROR: Documentation changes detected, please commit them."
      exit 1
    fi
}

function check_no_documentation_changes {
  echo "Checking generated documentation is up to date"

}

function goimports_all {
    echo "Running goimports"
    ${GOPATH}/bin/goimports -l -w $(print_real_go_files)
    if [[ $? -ne 0 ]]; then
      echo "ERROR: goimports changes detected, please commit them."
      exit 1
    fi
}

generate_markdown
goimports_all
