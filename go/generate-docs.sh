#!/bin/bash

echo "Generating markdown using godocdown in..."
oldpwd="$(pwd)"
for i in $(find . -iname 'doc.go'); do
    dir="${i%/*}"
    echo "- $dir"
    cd "${dir}"
    "${GOPATH}/bin/godocdown" -heading=Title -o DOC.md
    ln -s DOC.md README.md 2> /dev/null # can fail
    cd "${oldpwd}"
done;
