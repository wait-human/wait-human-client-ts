#!/bin/bash
set -e

mkdir -p src/api
cp -r ../app/frontend/src/lib/api/{zod,schema.d.ts} ./src/api
