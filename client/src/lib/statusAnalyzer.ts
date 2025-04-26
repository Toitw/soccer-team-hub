// Define the types for the application status

export type Dependency = {
  name: string;
  version: string;
};

export type MissingItem = {
  path: string;
  impact: string;
};

export type ConfigurationIssue = {
  filename: string;
  severity: 'warning' | 'error';
  status: string;
  content?: string;
  error?: string;
  recommendation?: string;
  template?: string;
};

export type DatabaseModel = {
  name: string;
  description: string;
};

export type DatabaseStatus = {
  type: string;
  status: string;
  uri: string;
  error: string;
  lastConnected: string;
  missingModels: DatabaseModel[];
  recommendedActions: string[];
};

export type RecoveryStep = {
  title: string;
  description: string;
  command?: string;
  template?: string;
  scriptChanges?: string;
};

export type DirectoryItem = {
  name: string;
  type: 'folder' | 'file';
  status?: 'missing' | 'ok';
  children?: DirectoryItem[];
};

export interface AppStatus {
  summary: string;
  missingDependencies: Dependency[];
  currentDependencies: Dependency[];
  missingDirectories: string[];
  configIssues: ConfigurationIssue[];
  missingItems: MissingItem[];
  database: DatabaseStatus;
  recoverySteps: RecoveryStep[];
  backupCommand: string;
  directoryStructure: DirectoryItem;
}

// Function to fetch the status from the server
export async function fetchApplicationStatus(): Promise<AppStatus> {
  try {
    const response = await fetch('/api/diagnostics');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch application status: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching application status:", error);
    // Return default error status if server is not responding
    return getDefaultErrorStatus();
  }
}

// Fallback to provide default status in case the server is completely down
function getDefaultErrorStatus(): AppStatus {
  return {
    summary: "Unable to connect to diagnostic service. The application appears to be in a critical state with multiple issues preventing proper operation.",
    missingDependencies: [
      { name: "tsx", version: "^4.19.1" },
      { name: "typescript", version: "^5.6.3" }
    ],
    currentDependencies: [
      { name: "react", version: "^18.3.1" },
      { name: "react-dom", version: "^18.3.1" },
      { name: "express", version: "^4.21.2" }
    ],
    missingDirectories: [
      "client/src/migrations",
      "client/src/lib/data"
    ],
    configIssues: [
      {
        filename: "package.json",
        severity: "warning",
        status: "Missing Scripts",
        content: `{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    // Other scripts are properly defined
  }
}`,
        recommendation: "The script entries appear incomplete. Add necessary scripts for starting the application."
      }
    ],
    missingItems: [
      {
        path: ".env",
        impact: "Environment variables missing, affecting database connection and configuration"
      }
    ],
    database: {
      type: "PostgreSQL",
      status: "Disconnected",
      uri: "undefined (Missing from .env)",
      error: "Cannot connect to database / Missing environment variables",
      lastConnected: "Never",
      missingModels: [
        {
          name: "User Model",
          description: "Authentication and user management functionality affected"
        }
      ],
      recommendedActions: [
        "Install missing database dependencies: `npm install drizzle-orm`",
        "Create .env file with proper database connection string",
        "Verify database schema is correctly defined",
        "Ensure the DATABASE_URL environment variable is properly set"
      ]
    },
    recoverySteps: [
      {
        title: "Restore Missing Dependencies",
        description: "Install all missing NPM packages identified in the dependency analysis.",
        command: "npm install tsx typescript -D"
      },
      {
        title: "Create Environment File",
        description: "Create a new .env file in the project root with the required variables.",
        template: `DATABASE_URL=postgresql://username:password@hostname:port/database
NODE_ENV=development`
      }
    ],
    backupCommand: "# Create timestamped backup of current project\ntar -czvf project_backup_$(date +%Y%m%d_%H%M%S).tar.gz .",
    directoryStructure: {
      name: "project_root",
      type: "folder",
      children: [
        {
          name: "client",
          type: "folder",
          children: [
            {
              name: "src",
              type: "folder",
              children: []
            },
            {
              name: "index.html",
              type: "file"
            }
          ]
        },
        {
          name: "server",
          type: "folder",
          children: [
            {
              name: "index.ts",
              type: "file"
            },
            {
              name: "routes.ts",
              type: "file"
            },
            {
              name: "storage.ts",
              type: "file"
            },
            {
              name: "vite.ts",
              type: "file"
            }
          ]
        },
        {
          name: "shared",
          type: "folder",
          children: [
            {
              name: "schema.ts",
              type: "file"
            }
          ]
        },
        {
          name: ".env",
          type: "file",
          status: "missing"
        },
        {
          name: "package.json",
          type: "file"
        }
      ]
    }
  };
}
