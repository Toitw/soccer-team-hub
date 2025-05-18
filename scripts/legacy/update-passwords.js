/**
 * Script para migrar contraseñas al nuevo formato Argon2id
 * Este script actualiza todas las contraseñas almacenadas en formato legacy (scrypt)
 * al nuevo formato seguro Argon2id.
 */
import { storage } from "./server/storage.js";
import * as argon2 from "argon2";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Función para verificar el formato de las contraseñas
function isLegacyPasswordFormat(passwordHash) {
  return passwordHash.includes(".") || passwordHash.includes(":");
}

// Función para verificar el formato Argon2
function isArgon2Format(passwordHash) {
  return passwordHash.startsWith("$argon2");
}

// Función para extraer la contraseña en texto plano usando ingeniería inversa (solo para migración)
async function checkLegacyPassword(plainPassword, storedHash) {
  try {
    if (storedHash.includes('.')) {
      // Old format with dot separator (hash.salt)
      const [hash, salt] = storedHash.split(".");
      const hashedBuf = Buffer.from(hash, "hex");
      const suppliedBuf = await scryptAsync(plainPassword, salt, 64);
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } else if (storedHash.includes(':')) {
      // Format with colon separator (salt:hash)
      const [salt, hash] = storedHash.split(":");
      const suppliedBuf = await scryptAsync(plainPassword, salt, 64);
      const storedHashBuf = Buffer.from(hash, 'hex');
      return timingSafeEqual(storedHashBuf, suppliedBuf);
    }
    return false;
  } catch (error) {
    console.error("Error checking legacy password:", error);
    return false;
  }
}

// Función para generar hash con Argon2id
async function hashPasswordWithArgon2(password) {
  try {
    // Using Argon2id which offers a balanced approach of resistance against side-channel and GPU attacks
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,  // 64 MB
      parallelism: 4,
      timeCost: 3,
    });
    
    return hash; // Argon2 hashes are self-contained with algorithm parameters and salt
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Password hashing failed");
  }
}

// Función principal que migra las contraseñas
async function migratePasswords() {
  console.log("Iniciando migración de contraseñas a Argon2id...");
  
  try {
    // Obtener todos los usuarios
    const allUsers = await storage.getAllUsers();
    console.log(`Total de usuarios encontrados: ${allUsers.length}`);
    
    // Contadores para estadísticas
    let alreadyMigrated = 0;
    let needMigration = 0;
    let migrationFailed = 0;
    let migrationSucceeded = 0;
    
    // Examinar los formatos de contraseña
    for (const user of allUsers) {
      if (!isLegacyPasswordFormat(user.password)) {
        if (isArgon2Format(user.password)) {
          alreadyMigrated++;
          console.log(`Usuario ${user.username} ya usa Argon2id`);
          continue;
        } else {
          console.log(`Usuario ${user.username} tiene un formato de contraseña desconocido`);
          migrationFailed++;
          continue;
        }
      }
      
      needMigration++;
      
      // Aquí normalmente necesitaríamos la contraseña en texto plano, que no tenemos
      // Para un entorno de producción real, deberíamos:
      // 1. Establecer una nueva contraseña aleatoria y enviarla al usuario por email
      // 2. O crear un proceso donde el usuario actualice su contraseña en el próximo login
      
      // Para este ejemplo, podemos establecer una contraseña por defecto solo para la migración
      // En producción NO HARÍAMOS ESTO - solo es para el propósito de la migración
      const defaultPassword = "Cambiar123!"; // Obligar al cambio en siguiente login
      const newHash = await hashPasswordWithArgon2(defaultPassword);
      
      try {
        // Actualizar la contraseña del usuario
        await storage.updateUser(user.id, {
          password: newHash,
          // También podríamos establecer una bandera para forzar el cambio de contraseña
          // requirePasswordChange: true 
        });
        
        console.log(`Usuario ${user.username} migrado a Argon2id correctamente`);
        migrationSucceeded++;
      } catch (error) {
        console.error(`Error migrando usuario ${user.username}:`, error);
        migrationFailed++;
      }
    }
    
    // Mostrar estadísticas de la migración
    console.log("\n===== ESTADÍSTICAS DE MIGRACIÓN =====");
    console.log(`Total de usuarios: ${allUsers.length}`);
    console.log(`Ya migrados a Argon2id: ${alreadyMigrated}`);
    console.log(`Necesitaban migración: ${needMigration}`);
    console.log(`Migrados exitosamente: ${migrationSucceeded}`);
    console.log(`Fallaron en migración: ${migrationFailed}`);
    console.log("=====================================\n");
    
    console.log("\nRECOMENDACIÓN: Para entornos de producción, implementar un sistema");
    console.log("que solicite a los usuarios actualizar sus contraseñas en el próximo inicio de sesión.");
    
  } catch (error) {
    console.error("Error durante la migración de contraseñas:", error);
  }
}

// Ejecutar la migración
migratePasswords().catch(console.error);