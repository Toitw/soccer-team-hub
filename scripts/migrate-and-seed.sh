#!/bin/bash

# Script para ejecutar las migraciones y el seed de la base de datos
echo "Ejecutando migraciones y seed de la base de datos..."
echo "======================"

# Ejecutar migraciones (push)
echo "1. Ejecutando migraciones..."
npx drizzle-kit push

# Ejecutar seed
echo "2. Ejecutando seed..."
npx tsx server/seed.ts

echo "======================"
echo "Migraciones y seed completados"