import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, CheckSquare, Upload, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

export const PortalDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    documents: 0,
    unreadMessages: 0,
    pendingTasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    if (!profile?.client_id) return;

    try {
      // Fetch documents count
      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("client_id", profile.client_id);

      // Fetch pending tasks count
      const { count: tasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("client_id", profile.client_id)
        .in("status", ["todo", "in_progress"]);

      // Fetch unread messages count (conversations with recent messages)
      const { count: messagesCount } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("client_id", profile.client_id)
        .gt("last_message_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      setStats({
        documents: docsCount || 0,
        unreadMessages: messagesCount || 0,
        pendingTasks: tasksCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: "Documents",
      value: stats.documents,
      description: "Total documents",
      icon: FileText,
      action: () => navigate("/portal/documents"),
      actionLabel: "View Documents",
    },
    {
      title: "Messages",
      value: stats.unreadMessages,
      description: "Recent conversations",
      icon: MessageSquare,
      action: () => navigate("/portal/messages"),
      actionLabel: "View Messages",
    },
    {
      title: "Tasks",
      value: stats.pendingTasks,
      description: "Pending tasks",
      icon: CheckSquare,
      action: () => navigate("/portal/tasks"),
      actionLabel: "View Tasks",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome Back!</h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your account
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              <Button
                variant="link"
                size="sm"
                onClick={stat.action}
                className="mt-2 p-0 h-auto"
              >
                {stat.actionLabel} →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-2 p-4"
              onClick={() => navigate("/portal/documents")}
            >
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <span className="font-semibold">Upload Document</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Share files with your accountant
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-2 p-4"
              onClick={() => navigate("/portal/messages")}
            >
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                <span className="font-semibold">Send Message</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Communicate with your team
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Welcome to your client portal! Here you can:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>View and upload documents securely</li>
            <li>Communicate with your accountant</li>
            <li>Track tasks and deadlines</li>
            <li>Manage your account information</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
