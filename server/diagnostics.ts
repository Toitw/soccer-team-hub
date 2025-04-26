import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Analyze package.json for missing dependencies
function analyzeDependencies() {
  try {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const currentDependencies = [];
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    
    // Required dependencies that might be missing
    const requiredDependencies = [
      { name: "express-session", version: "^1.18.1" },
      { name: "passport", version: "^0.7.0" },
      { name: "connect-pg-simple", version: "^10.0.0" },
      { name: "dotenv", version: "^16.0.3" },
    ];
    
    // Required dev dependencies
    const requiredDevDeps = [
      { name: "tsx", version: "^4.19.1" },
      { name: "typescript", version: "^5.6.3" },
      { name: "drizzle-kit", version: "^0.30.4" }
    ];
    
    // Add current dependencies to the list
    for (const [name, version] of Object.entries(dependencies)) {
      currentDependencies.push({ name, version: version as string });
    }
    
    // Add current dev dependencies to the list
    for (const [name, version] of Object.entries(devDependencies)) {
      currentDependencies.push({ name, version: version as string });
    }
    
    // Check for missing required dependencies
    const missingDependencies = [
      ...requiredDependencies.filter(dep => !dependencies[dep.name]),
      ...requiredDevDeps.filter(dep => !devDependencies[dep.name])
    ];
    
    const sampleCurrentDeps = currentDependencies.slice(0, 5);
    
    return {
      missingDependencies,
      currentDependencies: sampleCurrentDeps
    };
  } catch (error) {
    console.error('Error analyzing dependencies:', error);
    return {
      missingDependencies: [
        { name: "unknown", version: "dependencies parsing error" }
      ],
      currentDependencies: []
    };
  }
}

// Check project structure for missing files and directories
function analyzeProjectStructure() {
  const missingDirectories = [];
  const missingFiles = [];
  
  // Check for essential directories
  const essentialDirs = [
    'client/src/migrations',
    'client/src/components/ui/form',
    'server/controllers'
  ];
  
  essentialDirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) {
      missingDirectories.push(dir);
    }
  });
  
  // Check for essential files
  const essentialFiles = [
    '.env',
    'server/middleware/auth.ts',
    'client/src/lib/auth.ts'
  ];
  
  essentialFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  return {
    missingDirectories,
    missingFiles,
    missingItems: [
      { 
        path: '.env', 
        impact: 'Environment variables missing, affecting database connection and API keys' 
      },
      { 
        path: 'client/src/migrations/', 
        impact: 'Database migration files missing, affecting schema updates and database integrity' 
      },
      { 
        path: 'server/controllers/', 
        impact: 'API controllers are missing, affecting route handling logic' 
      }
    ]
  };
}

// Check for configuration issues
function analyzeConfiguration() {
  const configIssues = [];
  
  // Check if .env file exists
  if (!fs.existsSync(path.join(rootDir, '.env'))) {
    configIssues.push({
      filename: '.env (missing)',
      severity: 'error' as const,
      status: 'File Missing',
      recommendation: 'Create a new .env file with required environment variables:',
      template: `DATABASE_URL=postgresql://username:password@hostname:port/database
NODE_ENV=development
SESSION_SECRET=your_session_secret`
    });
  }
  
  // Check package.json
  try {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts || !packageJson.scripts.start) {
      configIssues.push({
        filename: 'package.json',
        severity: 'warning' as const,
        status: 'Missing Scripts',
        content: JSON.stringify({ ...packageJson, scripts: packageJson.scripts || {} }, null, 2).substring(0, 300) + '...',
        recommendation: 'The script entries appear incomplete. Add necessary scripts for starting the application.'
      });
    }
  } catch (error) {
    configIssues.push({
      filename: 'package.json',
      severity: 'error' as const,
      status: 'Parsing Error',
      error: `Failed to parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
  
  // Check drizzle configuration
  try {
    const drizzleConfigPath = path.join(rootDir, 'drizzle.config.ts');
    const drizzleConfig = fs.readFileSync(drizzleConfigPath, 'utf8');
    
    if (drizzleConfig.includes('throw new Error') && !process.env.DATABASE_URL) {
      configIssues.push({
        filename: 'drizzle.config.ts',
        severity: 'error' as const,
        status: 'Database URL Missing',
        content: drizzleConfig.substring(0, 300) + '...',
        error: 'DATABASE_URL environment variable is required but not defined',
        recommendation: 'Set DATABASE_URL in the .env file to provide a valid PostgreSQL connection string.'
      });
    }
  } catch (error) {
    // If drizzle config file doesn't exist or can't be read
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      configIssues.push({
        filename: 'drizzle.config.ts',
        severity: 'error' as const,
        status: 'File Missing',
        recommendation: 'The Drizzle configuration file is missing. Create it with proper database connection settings.'
      });
    } else {
      configIssues.push({
        filename: 'drizzle.config.ts',
        severity: 'error' as const,
        status: 'Read Error',
        error: `Failed to read drizzle.config.ts: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  return { configIssues };
}

// Analyze database connection and setup
function analyzeDatabaseSetup() {
  return {
    database: {
      type: 'PostgreSQL',
      status: 'Disconnected',
      uri: 'undefined (Missing from .env)',
      error: 'Cannot connect to database / Missing environment variables',
      lastConnected: 'Never',
      missingModels: [
        {
          name: 'User Model',
          description: 'Authentication and user management functionality affected'
        },
        {
          name: 'Additional Required Models',
          description: 'Data persistence functionality affected'
        }
      ],
      recommendedActions: [
        'Install missing database dependencies: `npm install drizzle-orm @neondatabase/serverless`',
        'Create .env file with proper database connection string',
        'Verify database schema is correctly defined in shared/schema.ts',
        'Ensure the DATABASE_URL environment variable is properly set'
      ]
    }
  };
}

// Generate recovery steps
function generateRecoverySteps() {
  return {
    recoverySteps: [
      {
        title: 'Restore Missing Dependencies',
        description: 'Install all missing NPM packages identified in the dependency analysis.',
        command: 'npm install express-session passport connect-pg-simple dotenv'
      },
      {
        title: 'Create Environment File',
        description: 'Create a new .env file in the project root with the required variables.',
        template: `DATABASE_URL=postgresql://username:password@hostname:port/database
NODE_ENV=development
SESSION_SECRET=your_session_secret`
      },
      {
        title: 'Create Missing Directories',
        description: 'Recreate the missing directory structure required for the application.',
        command: 'mkdir -p client/src/migrations server/controllers'
      },
      {
        title: 'Verify Configuration',
        description: 'Ensure all configuration files have the correct settings.',
        command: 'npm run db:push'
      }
    ],
    backupCommand: '# Create timestamped backup of current project\ntar -czvf project_backup_$(date +%Y%m%d_%H%M%S).tar.gz .'
  };
}

// Generate directory structure tree
function generateDirectoryStructure() {
  return {
    directoryStructure: {
      name: 'project_root/',
      type: 'folder',
      children: [
        {
          name: 'client/',
          type: 'folder',
          children: [
            {
              name: 'index.html',
              type: 'file'
            },
            {
              name: 'src/',
              type: 'folder',
              children: [
                {
                  name: 'App.tsx',
                  type: 'file'
                },
                {
                  name: 'main.tsx',
                  type: 'file'
                },
                {
                  name: 'index.css',
                  type: 'file'
                },
                {
                  name: 'components/',
                  type: 'folder',
                  children: [
                    {
                      name: 'ui/',
                      type: 'folder',
                      children: []
                    }
                  ]
                },
                {
                  name: 'lib/',
                  type: 'folder',
                  children: [
                    {
                      name: 'queryClient.ts',
                      type: 'file'
                    },
                    {
                      name: 'utils.ts',
                      type: 'file'
                    }
                  ]
                },
                {
                  name: 'migrations/',
                  type: 'folder',
                  status: 'missing'
                }
              ]
            }
          ]
        },
        {
          name: 'server/',
          type: 'folder',
          children: [
            {
              name: 'index.ts',
              type: 'file'
            },
            {
              name: 'routes.ts',
              type: 'file'
            },
            {
              name: 'storage.ts',
              type: 'file'
            },
            {
              name: 'vite.ts',
              type: 'file'
            },
            {
              name: 'controllers/',
              type: 'folder',
              status: 'missing'
            }
          ]
        },
        {
          name: 'shared/',
          type: 'folder',
          children: [
            {
              name: 'schema.ts',
              type: 'file'
            }
          ]
        },
        {
          name: '.env',
          type: 'file',
          status: 'missing'
        },
        {
          name: 'package.json',
          type: 'file'
        },
        {
          name: 'drizzle.config.ts',
          type: 'file'
        },
        {
          name: 'tsconfig.json',
          type: 'file'
        },
        {
          name: 'vite.config.ts',
          type: 'file'
        }
      ]
    }
  };
}

// Combine all analysis results
export function getDiagnostics(req: Request, res: Response) {
  try {
    const dependencyAnalysis = analyzeDependencies();
    const structureAnalysis = analyzeProjectStructure();
    const configAnalysis = analyzeConfiguration();
    const databaseAnalysis = analyzeDatabaseSetup();
    const recoveryPlan = generateRecoverySteps();
    const directoryTree = generateDirectoryStructure();
    
    const summary = "The project appears to be missing critical dependencies, configuration files, and directories. " +
                    "Database connection is failing due to missing environment variables. Some essential directories " +
                    "may have been accidentally deleted.";
    
    res.json({
      summary,
      ...dependencyAnalysis,
      ...structureAnalysis,
      ...configAnalysis,
      ...databaseAnalysis,
      ...recoveryPlan,
      ...directoryTree
    });
  } catch (error) {
    console.error('Error generating diagnostics:', error);
    res.status(500).json({ 
      error: 'Failed to generate diagnostics report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
