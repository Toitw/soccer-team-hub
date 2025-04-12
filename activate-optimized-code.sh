#!/bin/bash

# This script activates the optimized code by renaming files and updating imports

# Make backup directory if it doesn't exist
mkdir -p backups

# Backup original files
if [ -f shared/schema.ts ]; then
  cp shared/schema.ts backups/schema.ts.bak
fi

if [ -f server/auth.ts ]; then
  cp server/auth.ts backups/auth.ts.bak
fi

if [ -f server/storage.ts ]; then
  cp server/storage.ts backups/storage.ts.bak
fi

if [ -f server/index.ts ]; then
  cp server/index.ts backups/index.ts.bak
fi

# Move optimized files to replace originals
cp shared/optimized-schema.ts shared/schema.ts
cp server/optimized-auth.ts server/auth.ts
cp server/entity-storage.ts server/storage.ts
cp server/optimized-index.ts server/index.ts

# Update imports in auth.ts to use our shared auth utilities
sed -i 's/import { scrypt, randomBytes, timingSafeEqual } from "crypto";/import { hashPassword, comparePasswords } from "@shared\/auth-utils";/g' server/auth.ts
sed -i '/const scryptAsync = promisify(scrypt);/d' server/auth.ts
sed -i '/export async function hashPassword/,/^}/d' server/auth.ts
sed -i '/export async function comparePasswords/,/^}/d' server/auth.ts

echo "Optimized code has been activated. Original files are backed up in the backups directory."
echo "Restart the application to apply changes."
