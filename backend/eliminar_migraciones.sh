#!/bin/sh
find . -path ./ENV -prune -o -name 'migrations' -type d -exec rm -rf {} +