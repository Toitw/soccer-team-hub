// Script para probar la integridad de datos
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function testDataIntegrity() {
  console.log("Probando restricciones de integridad y manejo de errores...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 1. Intentar crear un miembro duplicado (violar restricción única)
    console.log("\n1. Probando violación de restricción única en team_members:");
    try {
      await pool.query(`
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES (2, 1, 'player', NOW())
      `);
      console.log("❌ ERROR: Se permitió crear un miembro duplicado");
    } catch (error) {
      if (error.code === '23505') {
        if (error.detail && error.detail.includes('team_members_team_id_user_id_unique')) {
          console.log("✅ Correcto: Se detectó violación de restricción única");
          console.log(`   Mensaje: ${error.detail}`);
        } else {
          console.log("✅ Correcto: Se detectó violación de otra restricción única");
          console.log(`   Mensaje: ${error.detail || error.message}`);
        }
      } else {
        console.log("❌ ERROR: Se produjo un error inesperado:", error.message);
      }
    }

    // 2. Intentar crear una referencia a un equipo que no existe (violar FK)
    console.log("\n2. Probando violación de clave foránea:");
    try {
      await pool.query(`
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES (999, 1, 'admin', NOW())
      `);
      console.log("❌ ERROR: Se permitió crear una referencia inválida");
    } catch (error) {
      if (error.code === '23503') {
        console.log("✅ Correcto: Se detectó violación de clave foránea");
        console.log(`   Mensaje: ${error.detail}`);
      } else {
        console.log("❌ ERROR: Se produjo un error inesperado:", error.message);
      }
    }

    // 3. Probar ON DELETE CASCADE eliminando un equipo
    console.log("\n3. Probando ON DELETE CASCADE:");
    
    // Crear un equipo temporal para la prueba
    const teamResult = await pool.query(`
      INSERT INTO teams (name, logo, division, season_year, created_by_id, join_code)
      VALUES ('Equipo Temporal', 'logo.png', 'Test Division', '2025', 1, 'TMPTEAM')
      RETURNING id
    `);
    const tempTeamId = teamResult.rows[0].id;
    
    // Añadir un miembro al equipo temporal
    await pool.query(`
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES ($1, 1, 'admin', NOW())
    `, [tempTeamId]);
    
    // Verificar que el miembro existe
    const membersBeforeResult = await pool.query(`
      SELECT COUNT(*) FROM team_members WHERE team_id = $1
    `, [tempTeamId]);
    console.log(`   Miembros antes de eliminar el equipo: ${membersBeforeResult.rows[0].count}`);
    
    // Eliminar el equipo
    await pool.query(`DELETE FROM teams WHERE id = $1`, [tempTeamId]);
    
    // Verificar que el miembro se eliminó automáticamente
    const membersAfterResult = await pool.query(`
      SELECT COUNT(*) FROM team_members WHERE team_id = $1
    `, [tempTeamId]);
    
    if (parseInt(membersAfterResult.rows[0].count) === 0) {
      console.log("✅ Correcto: Los miembros se eliminaron automáticamente (ON DELETE CASCADE)");
    } else {
      console.log("❌ ERROR: Los miembros no se eliminaron con el equipo");
    }

    console.log("\nPruebas de integridad de datos completadas con éxito!");

  } catch (error) {
    console.error("Error en las pruebas:", error);
  } finally {
    await pool.end();
  }
}

testDataIntegrity();