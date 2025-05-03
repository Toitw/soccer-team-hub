/**
 * Database Health Check Module
 * 
 * This module provides functions to check the health and status of the database connection.
 * It includes functions for connection testing, query performance, and database stats.
 */

import { db, pool } from './db';
import { sql } from 'drizzle-orm';

// Check if the database is connected and responding
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    // Simple query to test connection
    const result = await db.execute(sql`SELECT 1 as health_check`);
    // Type assertion to handle the result more safely
    const rows = result as unknown as Array<{health_check: number}>;
    return rows.length > 0 && rows[0].health_check === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Get database connection stats
export async function getDatabaseStats(): Promise<any> {
  try {
    // Get connection pool stats
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
    
    // Get database stats from PostgreSQL
    const dbStats = await db.execute(sql`
      SELECT 
        pg_database.datname as database_name,
        pg_size_pretty(pg_database_size(pg_database.datname)) as database_size,
        pg_stat_activity.count as active_connections
      FROM pg_database
      LEFT JOIN (
        SELECT datname, count(*) as count 
        FROM pg_stat_activity 
        GROUP BY datname
      ) pg_stat_activity 
      ON pg_database.datname = pg_stat_activity.datname
      WHERE pg_database.datname = current_database()
    `);
    
    // Type assertion to safely handle database stats
    const dbStatsArray = dbStats as unknown as Array<Record<string, any>>;
    
    return {
      connectionPool: poolStats,
      database: dbStatsArray.length > 0 ? dbStatsArray[0] : null
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { error: 'Failed to get database statistics' };
  }
}

// Check query performance with a test query
export async function testQueryPerformance(): Promise<any> {
  try {
    const startTime = Date.now();
    
    // Execute a basic query
    await db.execute(sql`SELECT 1`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      responseTimeMs: responseTime,
      status: responseTime < 500 ? 'good' : responseTime < 1000 ? 'fair' : 'slow'
    };
  } catch (error) {
    console.error('Query performance test failed:', error);
    return { error: 'Failed to test query performance' };
  }
}

// Check if database tables exist and are properly structured
export async function validateDatabaseSchema(): Promise<any> {
  try {
    // Check if essential tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Type assertion to handle the tables result
    const tablesArray = tables as unknown as Array<{table_name: string}>;
    const tableNames = tablesArray.map(t => t.table_name);
    
    const requiredTables = [
      'users', 'teams', 'team_members', 'matches', 'events', 
      'attendance', 'player_stats', 'announcements', 'invitations',
      'sessions'
    ];
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    return {
      tablesExist: missingTables.length === 0,
      totalTables: tableNames.length,
      missingTables: missingTables.length > 0 ? missingTables : null
    };
  } catch (error) {
    console.error('Schema validation failed:', error);
    return { error: 'Failed to validate database schema' };
  }
}

// Main health check function that runs all checks
export async function checkDatabaseHealth(): Promise<any> {
  try {
    const isConnected = await isDatabaseHealthy();
    
    // If not connected, return early
    if (!isConnected) {
      return {
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      };
    }
    
    // Run all checks
    const [stats, performance, schema] = await Promise.all([
      getDatabaseStats(),
      testQueryPerformance(),
      validateDatabaseSchema()
    ]);
    
    return {
      status: 'connected',
      message: 'Database is healthy',
      timestamp: new Date().toISOString(),
      stats,
      performance,
      schema
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'error',
      message: 'Database health check failed',
      error: String(error),
      timestamp: new Date().toISOString()
    };
  }
}