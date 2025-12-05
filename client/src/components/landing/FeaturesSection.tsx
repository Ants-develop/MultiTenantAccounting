import { FeatureCard } from "./FeatureCard";
import { Users, Workflow, CheckSquare, FolderOpen, MessageSquare, BarChart3, Globe, Calendar } from "lucide-react";

export const FeaturesSection = () => {
    const features = [
        {
            icon: Users,
            title: "Client Management & CRM",
            description: "Centralize client information, track engagement, and manage relationships with powerful CRM tools designed for accounting practices."
        },
        {
            icon: Workflow,
            title: "Automated Workflows",
            description: "Create custom pipelines for tax returns, bookkeeping, and more. Automate routine tasks and ensure nothing falls through the cracks."
        },
        {
            icon: CheckSquare,
            title: "Task Management",
            description: "Assign tasks, set deadlines, and track progress across your team. Never miss another deadline with automated reminders."
        },
        {
            icon: FolderOpen,
            title: "Secure Document Storage",
            description: "Store, organize, and share documents securely with built-in version control and audit trails for compliance."
        },
        {
            icon: MessageSquare,
            title: "Team Collaboration",
            description: "Built-in messaging and communication tools keep your team aligned and clients informed throughout every engagement."
        },
        {
            icon: BarChart3,
            title: "Real-time Analytics",
            description: "Track performance metrics, monitor workflow progress, and gain insights into your practice's efficiency with comprehensive reporting."
        },
        {
            icon: Globe,
            title: "Client Portal Access",
            description: "Give clients secure access to their documents, tasks, and communication history through a branded portal experience."
        },
        {
            icon: Calendar,
            title: "Integrated Calendar",
            description: "Schedule appointments, set reminders for tax deadlines, and coordinate team availability with seamless calendar integration."
        }
    ];

    return (
        <section id="features" className="py-20 px-4 bg-muted/30">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Everything You Need to Run Your Practice
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Powerful features designed specifically for accounting professionals
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
};
