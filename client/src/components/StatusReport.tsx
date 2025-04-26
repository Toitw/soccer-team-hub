import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TabsContent, TabsList, TabsTrigger, Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AppStatus } from "@/lib/statusAnalyzer";
import { 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Folder, 
  FolderX, 
  FileX, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  File, 
  FileWarning 
} from "lucide-react";
import { useState } from "react";

interface StatusReportProps {
  status: AppStatus;
}

export function StatusReport({ status }: StatusReportProps) {
  const [expandAll, setExpandAll] = useState(false);
  
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <AlertCircle className="text-primary-600 mr-2" />
              <h1 className="text-xl font-semibold text-neutral-900">Project Status Reporter</h1>
            </div>
            <div className="text-sm text-neutral-500">
              Generated: <time dateTime={new Date().toISOString()}>{new Date().toLocaleString()}</time>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Overview */}
        <section className="mb-8">
          <div className="bg-white rounded-lg shadow border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-neutral-900">Project Status Overview</h2>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-error-50 text-error-700">
                Critical Issues Found
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                <div className="flex items-center">
                  <AlertCircle className="text-error-500 mr-2 h-5 w-5" />
                  <h3 className="text-sm font-medium text-neutral-700">Missing Dependencies</h3>
                </div>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">{status.missingDependencies.length}</p>
              </div>
              
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                <div className="flex items-center">
                  <FolderX className="text-warning-500 mr-2 h-5 w-5" />
                  <h3 className="text-sm font-medium text-neutral-700">Missing Directories</h3>
                </div>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">{status.missingDirectories.length}</p>
              </div>
              
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                <div className="flex items-center">
                  <FileWarning className="text-warning-500 mr-2 h-5 w-5" />
                  <h3 className="text-sm font-medium text-neutral-700">Configuration Issues</h3>
                </div>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">{status.configIssues.length}</p>
              </div>
              
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                <div className="flex items-center">
                  <Database className="text-primary-500 mr-2 h-5 w-5" />
                  <h3 className="text-sm font-medium text-neutral-700">Database Status</h3>
                </div>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">Disconnected</p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200 rounded-md">
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Quick Analysis</h3>
              <p className="text-sm text-neutral-600">
                {status.summary}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dependency Analysis */}
          <section>
            <div className="bg-white rounded-lg shadow border border-neutral-200 h-full">
              <div className="border-b border-neutral-200 px-6 py-4">
                <h2 className="text-lg font-medium text-neutral-900">Dependency Analysis</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-700">Missing Dependencies</h3>
                  <Button variant="link" className="text-sm text-primary-600 hover:text-primary-700 font-medium p-0 h-auto">
                    Generate Install Commands
                  </Button>
                </div>
                
                <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-6">
                  <ul className="space-y-2 font-mono text-sm">
                    {status.missingDependencies.map((dep, index) => (
                      <li key={index} className="flex items-center text-error-700">
                        <AlertCircle className="text-error-500 mr-2 h-4 w-4" />
                        <span>{dep.name}</span>
                        <span className="text-neutral-500 ml-2">{dep.version}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-700">Current Dependencies</h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-700">
                    {status.currentDependencies.length} packages
                  </span>
                </div>
                
                <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                  <ul className="space-y-2 font-mono text-sm">
                    {status.currentDependencies.map((dep, index) => (
                      <li key={index} className="flex items-center text-success-700">
                        <CheckCircle2 className="text-success-500 mr-2 h-4 w-4" />
                        <span>{dep.name}</span>
                        <span className="text-neutral-500 ml-2">{dep.version}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Project Structure */}
          <section>
            <div className="bg-white rounded-lg shadow border border-neutral-200 h-full">
              <div className="border-b border-neutral-200 px-6 py-4">
                <h2 className="text-lg font-medium text-neutral-900">Project Structure</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-700">Directory Structure</h3>
                  <div>
                    <Button 
                      variant="link" 
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium mr-2 p-0 h-auto"
                      onClick={() => setExpandAll(true)}
                    >
                      Expand All
                    </Button>
                    <Button 
                      variant="link" 
                      className="text-sm text-neutral-500 hover:text-neutral-700 font-medium p-0 h-auto"
                      onClick={() => setExpandAll(false)}
                    >
                      Collapse All
                    </Button>
                  </div>
                </div>
                
                <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 max-h-[400px] overflow-y-auto">
                  <ul className="space-y-1 text-sm">
                    <DirectoryTree 
                      structure={status.directoryStructure} 
                      expanded={expandAll}
                    />
                  </ul>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">Missing Files & Directories</h3>
                  <div className="bg-error-50 border border-error-200 rounded-md p-4">
                    <ul className="space-y-2 text-sm text-error-700">
                      {status.missingItems.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <AlertTriangle className="text-error-500 mr-2 h-4 w-4 mt-0.5" />
                          <div>
                            <span className="font-mono font-medium">{item.path}</span>
                            <p className="text-xs text-error-600 mt-1">{item.impact}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Configuration Analysis */}
          <section>
            <div className="bg-white rounded-lg shadow border border-neutral-200 h-full">
              <div className="border-b border-neutral-200 px-6 py-4">
                <h2 className="text-lg font-medium text-neutral-900">Configuration Analysis</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-700">Configuration Status</h3>
                  <Button variant="link" className="text-sm text-primary-600 hover:text-primary-700 font-medium p-0 h-auto">
                    Fix Issues
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {status.configIssues.map((config, index) => (
                    <div key={index} className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {config.severity === 'warning' ? (
                            <AlertTriangle className="text-warning-500 mr-2 h-4 w-4" />
                          ) : (
                            <AlertCircle className="text-error-500 mr-2 h-4 w-4" />
                          )}
                          <h4 className="text-sm font-medium">{config.filename}</h4>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          config.severity === 'warning' 
                            ? 'bg-warning-50 text-warning-700' 
                            : 'bg-error-50 text-error-700'
                        }`}>
                          {config.status}
                        </span>
                      </div>
                      
                      {config.content && (
                        <div className="mt-2 bg-neutral-800 text-neutral-100 p-3 rounded text-xs overflow-x-auto font-mono">
                          <pre>{config.content}</pre>
                        </div>
                      )}
                      
                      {config.error && (
                        <div className="mt-2 text-xs text-error-600">
                          {config.error}
                        </div>
                      )}
                      
                      {config.recommendation && (
                        <div className="mt-2 text-xs text-neutral-600">
                          {config.recommendation}
                        </div>
                      )}
                      
                      {config.template && (
                        <div className="mt-2 bg-neutral-800 text-neutral-100 p-3 rounded text-xs overflow-x-auto font-mono">
                          <pre>{config.template}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Database Status */}
          <section>
            <div className="bg-white rounded-lg shadow border border-neutral-200 h-full">
              <div className="border-b border-neutral-200 px-6 py-4">
                <h2 className="text-lg font-medium text-neutral-900">Database Status</h2>
              </div>
              
              <div className="p-6">
                <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Database className="text-error-500 mr-2 h-5 w-5" />
                      <h3 className="text-sm font-medium text-neutral-700">{status.database.type} Connection</h3>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-error-50 text-error-700">
                      {status.database.status}
                    </span>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="text-neutral-500 text-sm w-24">URI:</span>
                      <span className="text-sm font-mono font-medium text-error-700">{status.database.uri}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-neutral-500 text-sm w-24">Error:</span>
                      <span className="text-sm text-error-700">{status.database.error}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-neutral-500 text-sm w-24">Last Connected:</span>
                      <span className="text-sm text-neutral-700">{status.database.lastConnected}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">Missing Models</h3>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                    <ul className="space-y-3 text-sm">
                      {status.database.missingModels.map((model, index) => (
                        <li key={index} className="flex items-start">
                          <FolderX className="text-error-500 mr-2 h-4 w-4 mt-0.5" />
                          <div>
                            <div className="font-medium text-neutral-800">{model.name}</div>
                            <p className="text-xs text-neutral-600 mt-1">{model.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">Recommended Actions</h3>
                  <div className="bg-neutral-50 border border-primary-200 rounded-md p-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-neutral-700">
                      {status.database.recommendedActions.map((action, index) => (
                        <li key={index}>
                          {action.includes('`') ? (
                            <>
                              {action.split('`')[0]}
                              <code className="px-2 py-1 bg-neutral-200 rounded text-xs font-mono">
                                {action.split('`')[1]}
                              </code>
                              {action.split('`')[2]}
                            </>
                          ) : (
                            action
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
        
        {/* Recovery Plan */}
        <section className="mt-8">
          <div className="bg-white rounded-lg shadow border border-neutral-200">
            <div className="border-b border-neutral-200 px-6 py-4">
              <h2 className="text-lg font-medium text-neutral-900">Recovery Plan</h2>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 mb-3">Step-by-Step Recovery Actions</h3>
                <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                  <ol className="space-y-4">
                    {status.recoverySteps.map((step, index) => (
                      <li key={index} className="flex">
                        <div className="flex-shrink-0 h-6 w-6 bg-primary-600 text-white rounded-full flex items-center justify-center mr-3 mt-0.5 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-neutral-800">{step.title}</h4>
                          <p className="mt-1 text-sm text-neutral-600">{step.description}</p>
                          {step.command && (
                            <div className="mt-2 bg-neutral-800 text-neutral-100 p-3 rounded text-xs overflow-x-auto font-mono">
                              <pre>{step.command}</pre>
                            </div>
                          )}
                          {step.template && (
                            <div className="mt-2 bg-neutral-800 text-neutral-100 p-3 rounded text-xs overflow-x-auto font-mono">
                              <pre>{step.template}</pre>
                            </div>
                          )}
                          {step.scriptChanges && (
                            <div className="mt-2 bg-neutral-800 text-neutral-100 p-3 rounded text-xs overflow-x-auto font-mono">
                              <pre>{step.scriptChanges}</pre>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-700">Backup Recommendation</h3>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-warning-50 text-warning-700">Important</span>
                </div>
                
                <div className="bg-warning-50 border border-warning-200 rounded-md p-4">
                  <div className="flex">
                    <Info className="text-warning-700 mr-3 h-5 w-5" />
                    <div>
                      <p className="text-sm text-warning-700">
                        Before implementing any recovery steps, create a backup of the current project state to avoid potential data loss.
                      </p>
                      <div className="mt-3 bg-neutral-800 text-neutral-100 p-3 rounded text-xs overflow-x-auto font-mono">
                        <pre>{status.backupCommand}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-white border-t border-neutral-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-neutral-500">
              Project Status Report generated automatically
            </p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <Button variant="link" className="text-sm text-primary-600 hover:text-primary-700 font-medium p-0 h-auto">
                Export as PDF
              </Button>
              <Button variant="link" className="text-sm text-primary-600 hover:text-primary-700 font-medium p-0 h-auto">
                Run Recovery
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface DirectoryTreeProps {
  structure: DirectoryItem;
  expanded: boolean;
}

interface DirectoryItem {
  name: string;
  type: 'folder' | 'file';
  status?: 'missing' | 'ok';
  children?: DirectoryItem[];
}

function DirectoryTree({ structure, expanded }: DirectoryTreeProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  return (
    <li>
      <div className="flex items-center py-1">
        {structure.type === 'folder' && structure.children && structure.children.length > 0 ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 p-0 mr-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        ) : (
          <div className="w-5 mr-1"></div>
        )}
        
        {structure.type === 'folder' && structure.status === 'missing' ? (
          <FolderX className="text-error-500 mr-1 h-4 w-4" />
        ) : structure.type === 'folder' ? (
          <Folder className="text-neutral-700 mr-1 h-4 w-4" />
        ) : structure.status === 'missing' ? (
          <FileX className="text-error-500 mr-1 h-4 w-4" />
        ) : (
          <File className="text-neutral-700 mr-1 h-4 w-4" />
        )}
        
        <span className={`${structure.status === 'missing' ? 'text-error-700' : ''} ${structure.type === 'folder' ? 'font-medium' : ''}`}>
          {structure.name}
          {structure.status === 'missing' && (
            <span className="text-error-500 font-medium text-xs ml-1">(MISSING)</span>
          )}
        </span>
      </div>
      
      {structure.type === 'folder' && structure.children && structure.children.length > 0 && isExpanded && (
        <ul className="pl-6 space-y-1 border-l border-neutral-200 ml-2">
          {structure.children.map((child, index) => (
            <li key={index}>
              {child.type === 'folder' && child.children && child.children.length > 0 ? (
                <DirectoryTree structure={child} expanded={expanded} />
              ) : (
                <div className="flex items-center py-1">
                  {child.type === 'folder' && child.status === 'missing' ? (
                    <FolderX className="text-error-500 mr-1 h-4 w-4" />
                  ) : child.type === 'folder' ? (
                    <Folder className="text-neutral-700 mr-1 h-4 w-4" />
                  ) : child.status === 'missing' ? (
                    <FileX className="text-error-500 mr-1 h-4 w-4" />
                  ) : (
                    <File className="text-neutral-700 mr-1 h-4 w-4" />
                  )}
                  
                  <span className={`${child.status === 'missing' ? 'text-error-700' : ''}`}>
                    {child.name}
                    {child.status === 'missing' && (
                      <span className="text-error-500 font-medium text-xs ml-1">(MISSING)</span>
                    )}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
