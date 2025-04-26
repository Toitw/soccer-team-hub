import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Folder,
  File,
  MoreHorizontal,
  FolderX,
  FileX
} from "lucide-react";

export function DiagnosticReport() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-primary mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </span>
            <h1 className="text-xl font-medium">Project Diagnostic Tool</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center text-muted-foreground hover:text-primary transition-colors">
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
            <button className="flex items-center text-muted-foreground hover:text-primary transition-colors">
              <Download className="w-4 h-4 mr-1" />
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Status Overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-medium mb-4">Project Status Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusCard 
              title="Issues Found" 
              value="8" 
              description="Critical issues that require attention" 
              status="error" 
            />
            <StatusCard 
              title="Missing Dependencies" 
              value="3" 
              description="Dependencies referenced but not installed" 
              status="warning" 
            />
            <StatusCard 
              title="Configuration" 
              value="Incomplete" 
              description="Missing or incorrect configuration files" 
              status="info" 
            />
            <StatusCard 
              title="Database Connection" 
              value="OK" 
              description="Database configuration is valid" 
              status="success" 
            />
          </div>
        </section>

        {/* Detailed Analysis */}
        <Tabs defaultValue="project-structure" className="bg-white rounded-lg shadow-sm p-5 mb-8">
          <TabsList className="border-b w-full justify-start rounded-none">
            <TabsTrigger value="project-structure">Project Structure</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
          </TabsList>
          
          <TabsContent value="project-structure" className="py-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Directory Structure Analysis</h3>
              <p className="mb-4 text-muted-foreground">The following issues were detected in your project structure:</p>
              
              <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-4">
                <h4 className="font-medium text-destructive">Missing Critical Directories</h4>
                <p className="text-sm mt-1">Key directories appear to be missing from your project, which may cause functionality issues.</p>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">Current Project Structure</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <div className="flex items-center">
                      <Folder className="text-muted-foreground mr-2 h-4 w-4" />
                      <span className="font-medium">project-root</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-mono text-sm">
                      <div className="ml-4">
                        <div className="flex items-start">
                          <Folder className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>node_modules</span>
                        </div>
                        <div className="flex items-start ml-4">
                          <MoreHorizontal className="text-muted-foreground mr-2 h-4 w-4" />
                          <span className="text-muted-foreground">installed dependencies</span>
                        </div>
                        
                        <div className="flex items-start mt-2">
                          <Folder className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>public</span>
                        </div>
                        <div className="flex items-start ml-4">
                          <File className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>index.html</span>
                        </div>
                        <div className="flex items-start ml-4">
                          <File className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>favicon.ico</span>
                        </div>
                        
                        <div className="flex items-start mt-2">
                          <Folder className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>src</span>
                        </div>
                        <div className="flex items-start ml-4">
                          <FolderX className="text-destructive mr-2 h-4 w-4" />
                          <span className="line-through text-destructive">components (missing)</span>
                        </div>
                        <div className="flex items-start ml-4">
                          <FolderX className="text-destructive mr-2 h-4 w-4" />
                          <span className="line-through text-destructive">pages (missing)</span>
                        </div>
                        <div className="flex items-start ml-4">
                          <File className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>index.js</span>
                        </div>
                        <div className="flex items-start ml-4">
                          <File className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>App.js</span>
                        </div>
                        
                        <div className="flex items-start mt-2">
                          <File className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>package.json</span>
                        </div>
                        <div className="flex items-start mt-1">
                          <FileX className="text-destructive mr-2 h-4 w-4" />
                          <span className="line-through text-destructive">package-lock.json (missing)</span>
                        </div>
                        <div className="flex items-start mt-1">
                          <File className="text-muted-foreground mr-2 h-4 w-4" />
                          <span>.gitignore</span>
                        </div>
                        <div className="flex items-start mt-1">
                          <FileX className="text-destructive mr-2 h-4 w-4" />
                          <span className="line-through text-destructive">.env (missing)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-warning/10 border-l-4 border-warning p-4">
                <h4 className="font-medium text-warning">Recommended Action</h4>
                <p className="text-sm mt-1">Create the missing directories and files. It appears you may have accidentally deleted critical components.</p>
                <div className="mt-2">
                  <code className="bg-muted text-sm p-1 rounded">mkdir -p src/components src/pages</code>
                </div>
                <div className="mt-2">
                  <code className="bg-muted text-sm p-1 rounded">touch .env</code>
                </div>
                <div className="mt-2">
                  <code className="bg-muted text-sm p-1 rounded">npm install</code> <span className="text-xs text-muted-foreground">(to regenerate package-lock.json)</span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="dependencies" className="py-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Dependencies Analysis</h3>
              <p className="mb-4 text-muted-foreground">The following issues were detected in your project dependencies:</p>
              
              <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-4">
                <h4 className="font-medium text-destructive">Missing Required Dependencies</h4>
                <p className="text-sm mt-1">Dependencies referenced in code but missing from package.json or node_modules.</p>
              </div>
              
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border px-4 py-2 text-left">Dependency</th>
                      <th className="border px-4 py-2 text-left">Type</th>
                      <th className="border px-4 py-2 text-left">Status</th>
                      <th className="border px-4 py-2 text-left">Used In</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-4 py-2 font-medium text-destructive">react-router-dom</td>
                      <td className="border px-4 py-2">Production</td>
                      <td className="border px-4 py-2">
                        <span className="bg-destructive text-white text-xs px-2 py-1 rounded-full">Missing</span>
                      </td>
                      <td className="border px-4 py-2">App.js, 3 other files</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium text-destructive">axios</td>
                      <td className="border px-4 py-2">Production</td>
                      <td className="border px-4 py-2">
                        <span className="bg-destructive text-white text-xs px-2 py-1 rounded-full">Missing</span>
                      </td>
                      <td className="border px-4 py-2">API.js, 2 other files</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium text-destructive">styled-components</td>
                      <td className="border px-4 py-2">Production</td>
                      <td className="border px-4 py-2">
                        <span className="bg-destructive text-white text-xs px-2 py-1 rounded-full">Missing</span>
                      </td>
                      <td className="border px-4 py-2">Multiple components</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">react</td>
                      <td className="border px-4 py-2">Production</td>
                      <td className="border px-4 py-2">
                        <span className="bg-success text-white text-xs px-2 py-1 rounded-full">Installed</span>
                      </td>
                      <td className="border px-4 py-2">All components</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">react-dom</td>
                      <td className="border px-4 py-2">Production</td>
                      <td className="border px-4 py-2">
                        <span className="bg-success text-white text-xs px-2 py-1 rounded-full">Installed</span>
                      </td>
                      <td className="border px-4 py-2">index.js</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-zinc-900 p-4 rounded-lg mb-4 text-white font-mono text-sm">
# package.json (Current){"\n"}
{"{"}
  "name": "your-project",
  "version": "0.1.0",
  "private": true,
  "dependencies": {"{"}
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-scripts": "5.0.0"
  {"}"},
  "scripts": {"{"}
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  {"}"}
{"}"}
              </div>
              
              <div className="bg-warning/10 border-l-4 border-warning p-4">
                <h4 className="font-medium text-warning">Recommended Action</h4>
                <p className="text-sm mt-1">Install the missing dependencies:</p>
                <div className="mt-2">
                  <code className="bg-muted text-sm p-1 rounded">npm install react-router-dom axios styled-components</code>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="configuration" className="py-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Configuration Analysis</h3>
              <p className="mb-4 text-muted-foreground">The following issues were detected in your project configuration:</p>
              
              <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-4">
                <h4 className="font-medium text-destructive">Missing Environment Configuration</h4>
                <p className="text-sm mt-1">Environment variables are referenced but no .env file exists.</p>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">Missing Environment Variables</h4>
                <div className="border rounded-lg">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border px-4 py-2 text-left">Environment Variable</th>
                        <th className="border px-4 py-2 text-left">Used In</th>
                        <th className="border px-4 py-2 text-left">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border px-4 py-2 font-medium">REACT_APP_API_URL</td>
                        <td className="border px-4 py-2">API.js</td>
                        <td className="border px-4 py-2">Base URL for API requests</td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium">REACT_APP_AUTH_KEY</td>
                        <td className="border px-4 py-2">Auth.js</td>
                        <td className="border px-4 py-2">Authentication configuration</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Expected .env File</h4>
                <div className="bg-zinc-900 p-4 rounded-lg text-white font-mono text-sm">
REACT_APP_API_URL=https://api.example.com{"\n"}
REACT_APP_AUTH_KEY=your-auth-key
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">Other Configuration Issues</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li className="text-warning">
                    <span className="font-medium">ESLint Configuration:</span> 
                    <span className="text-muted-foreground">Missing .eslintrc.js file</span>
                  </li>
                  <li className="text-warning">
                    <span className="font-medium">Webpack Configuration:</span>
                    <span className="text-muted-foreground">Missing custom webpack config</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-warning/10 border-l-4 border-warning p-4">
                <h4 className="font-medium text-warning">Recommended Action</h4>
                <p className="text-sm mt-1">Create the missing configuration files:</p>
                <div className="mt-2">
                  <code className="bg-muted text-sm p-1 rounded">touch .env .eslintrc.js</code>
                </div>
                <p className="text-sm mt-2">Populate the .env file with the required variables as shown above.</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="database" className="py-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Database Configuration Analysis</h3>
              <p className="mb-4 text-muted-foreground">The database configuration appears to be correct, but is missing some optimizations.</p>
              
              <div className="bg-success/10 border-l-4 border-success p-4 mb-4">
                <h4 className="font-medium text-success">Database Connection Valid</h4>
                <p className="text-sm mt-1">The application can successfully connect to the database.</p>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">Database Configuration Summary</h4>
                <div className="border rounded-lg">
                  <table className="min-w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="border px-4 py-2 font-medium bg-muted/50">Type</td>
                        <td className="border px-4 py-2">MongoDB</td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium bg-muted/50">Connection Method</td>
                        <td className="border px-4 py-2">Mongoose</td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium bg-muted/50">Host</td>
                        <td className="border px-4 py-2">mongodb://localhost:27017</td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium bg-muted/50">Database Name</td>
                        <td className="border px-4 py-2">myapp</td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium bg-muted/50">Status</td>
                        <td className="border px-4 py-2">
                          <span className="flex items-center">
                            <CheckCircle2 className="h-3 w-3 text-success mr-2" />
                            Connected
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">Schema Status</h4>
                <div className="border rounded-lg">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border px-4 py-2 text-left">Collection</th>
                        <th className="border px-4 py-2 text-left">Status</th>
                        <th className="border px-4 py-2 text-left">Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border px-4 py-2">users</td>
                        <td className="border px-4 py-2">
                          <span className="flex items-center">
                            <CheckCircle2 className="h-3 w-3 text-success mr-2" />
                            Valid
                          </span>
                        </td>
                        <td className="border px-4 py-2">3</td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2">products</td>
                        <td className="border px-4 py-2">
                          <span className="flex items-center">
                            <CheckCircle2 className="h-3 w-3 text-success mr-2" />
                            Valid
                          </span>
                        </td>
                        <td className="border px-4 py-2">12</td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2">orders</td>
                        <td className="border px-4 py-2">
                          <span className="flex items-center">
                            <CheckCircle2 className="h-3 w-3 text-success mr-2" />
                            Valid
                          </span>
                        </td>
                        <td className="border px-4 py-2">5</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-warning/10 border-l-4 border-warning p-4">
                <h4 className="font-medium text-warning">Recommendations</h4>
                <p className="text-sm mt-1">Consider implementing the following improvements:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li>Add connection pooling for better performance</li>
                  <li>Move database credentials to environment variables</li>
                  <li>Add indexes to frequently queried fields</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Summary and Recommendations */}
        <section className="bg-white rounded-lg shadow-sm p-5 mb-8">
          <h2 className="text-xl font-medium mb-4">Summary and Recommendations</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Critical Issues</h3>
            <ul className="space-y-3">
              <li className="flex">
                <XCircle className="text-destructive mr-2 h-5 w-5" />
                <div>
                  <p className="font-medium">Missing core directories: <code>src/components</code> and <code>src/pages</code></p>
                  <p className="text-muted-foreground text-sm mt-1">These directories contain essential application components and are referenced in imports.</p>
                </div>
              </li>
              <li className="flex">
                <XCircle className="text-destructive mr-2 h-5 w-5" />
                <div>
                  <p className="font-medium">Missing dependencies: react-router-dom, axios, styled-components</p>
                  <p className="text-muted-foreground text-sm mt-1">These packages are imported in your code but not installed.</p>
                </div>
              </li>
              <li className="flex">
                <XCircle className="text-destructive mr-2 h-5 w-5" />
                <div>
                  <p className="font-medium">Missing environment configuration</p>
                  <p className="text-muted-foreground text-sm mt-1">Environment variables are referenced but no .env file exists.</p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Recovery Plan</h3>
            <ol className="space-y-4 list-decimal pl-5">
              <li>
                <p className="font-medium">Restore project structure</p>
                <div className="bg-muted p-3 rounded mt-2">
                  <code>mkdir -p src/components src/pages</code>
                </div>
                <p className="text-muted-foreground text-sm mt-1">Create these directories to hold your React components and page views.</p>
              </li>
              
              <li>
                <p className="font-medium">Install missing dependencies</p>
                <div className="bg-muted p-3 rounded mt-2">
                  <code>npm install react-router-dom axios styled-components</code>
                </div>
                <p className="text-muted-foreground text-sm mt-1">This will install the packages and update package.json and package-lock.json.</p>
              </li>
              
              <li>
                <p className="font-medium">Create environment configuration</p>
                <div className="bg-muted p-3 rounded mt-2">
                  <code>touch .env</code>
                </div>
                <p className="text-muted-foreground text-sm mt-1">Populate with required environment variables as documented in the Configuration tab.</p>
              </li>
              
              <li>
                <p className="font-medium">Verify project integrity</p>
                <div className="bg-muted p-3 rounded mt-2">
                  <code>npm run start</code>
                </div>
                <p className="text-muted-foreground text-sm mt-1">Run the application to ensure all issues are resolved.</p>
              </li>
            </ol>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Data Recovery Options</h3>
            <div className="bg-primary/10 border-l-4 border-primary p-4">
              <p className="font-medium">Check for Git history</p>
              <p className="text-sm mt-1">If this project is under version control, you may be able to recover deleted files:</p>
              <div className="mt-2">
                <code className="bg-muted text-sm p-1 rounded">git log</code> - View commit history
              </div>
              <div className="mt-1">
                <code className="bg-muted text-sm p-1 rounded">git checkout [commit] -- [file_path]</code> - Restore specific files
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  value: string;
  description: string;
  status: "success" | "warning" | "error" | "info";
}

function StatusCard({ title, value, description, status }: StatusCardProps) {
  const statusColorMap = {
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive",
    info: "bg-primary",
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex items-center mb-3">
        <div className={`inline-block w-3 h-3 rounded-full mr-2 ${statusColorMap[status]}`}></div>
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      <p className="text-3xl font-medium">{value}</p>
      <p className="text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
