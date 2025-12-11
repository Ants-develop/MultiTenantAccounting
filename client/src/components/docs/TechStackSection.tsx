import { Badge } from "@/components/ui/badge";

interface TechBadgeProps {
  name: string;
  category: "frontend" | "backend" | "database" | "tooling" | "ai";
  description: string;
}

const techStack: TechBadgeProps[] = [
  { name: "React 18", category: "frontend", description: "UI library with hooks" },
  { name: "TypeScript", category: "frontend", description: "Type-safe JavaScript" },
  { name: "Vite", category: "tooling", description: "Build tool & dev server" },
  { name: "Tailwind CSS", category: "frontend", description: "Utility-first styling" },
  { name: "shadcn/ui", category: "frontend", description: "Component library" },
  { name: "TanStack Query", category: "frontend", description: "Data fetching & caching" },
  { name: "React Router", category: "frontend", description: "Client-side routing" },
  { name: "React Hook Form", category: "frontend", description: "Form management" },
  { name: "Zod", category: "frontend", description: "Schema validation" },
  { name: "Supabase", category: "backend", description: "Backend-as-a-Service" },
  { name: "PostgreSQL", category: "database", description: "Relational database" },
  { name: "Row Level Security", category: "database", description: "Data access control" },
  { name: "Edge Functions", category: "backend", description: "Serverless functions" },
  { name: "Supabase Auth", category: "backend", description: "Authentication" },
  { name: "Supabase Storage", category: "backend", description: "File storage" },
  { name: "Lovable AI", category: "ai", description: "AI integration gateway" },
  { name: "Recharts", category: "frontend", description: "Data visualization" },
  { name: "Lucide Icons", category: "frontend", description: "Icon library" },
];

const categoryColors = {
  frontend: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  backend: "bg-green-500/10 text-green-600 border-green-500/20",
  database: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  tooling: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  ai: "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

const categoryLabels = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  tooling: "Tooling",
  ai: "AI",
};

export const TechStackSection = () => {
  const groupedTech = techStack.reduce((acc, tech) => {
    if (!acc[tech.category]) acc[tech.category] = [];
    acc[tech.category].push(tech);
    return acc;
  }, {} as Record<string, TechBadgeProps[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTech).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h4>
          <div className="flex flex-wrap gap-2">
            {items.map((tech) => (
              <Badge
                key={tech.name}
                variant="outline"
                className={`${categoryColors[tech.category]} px-3 py-1.5`}
              >
                <span className="font-medium">{tech.name}</span>
                <span className="ml-2 text-xs opacity-70">{tech.description}</span>
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
