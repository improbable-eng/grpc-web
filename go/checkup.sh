#!/bin/bash
# Script that checks up code (govet).

set -e

function print_real_go_files {
    grep --files-without-match 'DO NOT EDIT!' $(find . -iname '*.go')
}

function govet_all {
    echo "Running govet"
    ret=0
    for i in $(print_real_go_files); do
        output=$(go tool vet -all=true -tests=false ${i})
        ret=$(($ret | $?))
        echo -n ${output}
    done;
    return ${ret}
}

govet_all
echo "returning $?"
