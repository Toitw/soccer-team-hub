#!/bin/bash

# Script para ejecutar el seeder de la base de datos
echo "Ejecutando el seed de la base de datos..."
echo "======================"

# Ejecutar el seed
npx tsx server/seed.ts

echo "======================"
echo "Seed completado"