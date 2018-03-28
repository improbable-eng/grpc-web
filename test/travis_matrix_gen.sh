#!/usr/bin/env bash
# Generates the "matrix" property required in the travis.yml file.
# Prints each combination of BROWSER and TEST_SUITE_NAME from the arrays below

browsers=(
  "nodejs"
  "edge14_win"
  "edge13_win"
  "ie11_win"
  "firefox53_osx"
  "firefox39_osx"
  "firefox38_osx"
  "firefox21_osx"
  "chrome_57"
  "chrome_52"
  "chrome_43"
  "chrome_42"
  "chrome_41"
  "safari11"
  "safari9_1"
  "safari8"
  "safari6"
)

suites=(
  "client"
  "invoke"
  "unary"
  "ChunkParser"
  "cancellation"
  "detach"
)

for browser in "${browsers[@]}"
do
  :
  for suite in "${suites[@]}"
  do
    :
   echo "    - BROWSER=$browser TEST_SUITE_NAME=$suite"
   done
done
