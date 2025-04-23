# Scripts de mantenimiento de la base de datos

Este directorio contiene scripts utilizados para mantener y gestionar la base de datos.

## Scripts disponibles

### migrate-and-seed.sh

Este script ejecuta las migraciones de la base de datos (usando Drizzle push) y luego ejecuta el seeder para insertar datos iniciales.

Uso:
```bash
./scripts/migrate-and-seed.sh
```

### run-seed.sh

Este script ejecuta únicamente el seeder, útil para insertar datos iniciales en una base de datos ya migrada.

Uso:
```bash
./scripts/run-seed.sh
```

## Importante

El seeder de la base de datos es idempotente, lo que significa que puede ejecutarse múltiples veces sin crear entradas duplicadas. Comprobará si los datos ya existen antes de intentar crearlos.

## Inicialización automática

La aplicación ahora ejecuta automáticamente el seeder al iniciar, lo que garantiza que siempre existan los datos necesarios (como el usuario administrador) sin necesidad de ejecutar comandos adicionales cada vez que se inicia la aplicación.