import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Database, Shield, Briefcase, Cpu, Users, Boxes, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { DiagramCard } from "@/components/docs/DiagramCard";
import { TechStackSection } from "@/components/docs/TechStackSection";
import { ArchitectureOverview } from "@/components/docs/ArchitectureOverview";
import { ModulesHierarchy } from "@/components/docs/ModulesHierarchy";
import { UserRolesDiagram } from "@/components/docs/UserRolesDiagram";
import { DatabaseSchema } from "@/components/docs/DatabaseSchema";
import { AuthFlowDiagram } from "@/components/docs/AuthFlowDiagram";
import { WorkflowSystemDiagram } from "@/components/docs/WorkflowSystemDiagram";
import { EdgeFunctionsSection } from "@/components/docs/EdgeFunctionsSection";
import { RLSPoliciesSection } from "@/components/docs/RLSPoliciesSection";

const SystemArchitecture = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">System Architecture</h1>
              <p className="text-sm text-muted-foreground">
                Visual documentation of the application architecture
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Layers className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="modules" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Boxes className="h-4 w-4 mr-2" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" />
              Roles & Auth
            </TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Database className="h-4 w-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger value="workflows" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Briefcase className="h-4 w-4 mr-2" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="functions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Cpu className="h-4 w-4 mr-2" />
              Functions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <DiagramCard
              title="High-Level Architecture"
              description="Overview of the frontend, backend, and database layers"
            >
              <ArchitectureOverview />
            </DiagramCard>

            <DiagramCard
              title="Technology Stack"
              description="Technologies and libraries used in the project"
            >
              <TechStackSection />
            </DiagramCard>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <DiagramCard
              title="Application Modules"
              description="All modules and their routes organized by category"
            >
              <ModulesHierarchy />
            </DiagramCard>
          </TabsContent>

          {/* Roles & Auth Tab */}
          <TabsContent value="roles" className="space-y-6">
            <DiagramCard
              title="User Roles & Permissions"
              description="Role hierarchy and permission levels"
            >
              <UserRolesDiagram />
            </DiagramCard>

            <DiagramCard
              title="Authentication Flow"
              description="How users authenticate and gain access"
            >
              <AuthFlowDiagram />
            </DiagramCard>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-6">
            <DiagramCard
              title="Database Schema"
              description="Core tables and their relationships"
            >
              <DatabaseSchema />
            </DiagramCard>

            <DiagramCard
              title="Row Level Security (RLS) Policies"
              description="Database-level access control ensuring data security"
            >
              <RLSPoliciesSection />
            </DiagramCard>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-6">
            <DiagramCard
              title="Workflow System"
              description="Templates, jobs, stages, and task automation"
            >
              <WorkflowSystemDiagram />
            </DiagramCard>
          </TabsContent>

          {/* Functions Tab */}
          <TabsContent value="functions" className="space-y-6">
            <DiagramCard
              title="Edge Functions & Database Functions"
              description="Serverless functions and database logic"
            >
              <EdgeFunctionsSection />
            </DiagramCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SystemArchitecture;
