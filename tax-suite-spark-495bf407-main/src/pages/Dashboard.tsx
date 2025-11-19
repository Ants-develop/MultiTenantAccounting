import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckSquare, Clock, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CalendarWidget from "@/components/calendar/CalendarWidget";

const stats = [
  {
    title: "Active Clients",
    value: "124",
    change: "+12%",
    trend: "up",
    icon: Users,
    color: "text-primary",
  },
  {
    title: "Pending Tasks",
    value: "38",
    change: "-8%",
    trend: "down",
    icon: CheckSquare,
    color: "text-accent",
  },
  {
    title: "Overdue Items",
    value: "7",
    change: "+2",
    trend: "warning",
    icon: AlertCircle,
    color: "text-warning",
  },
  {
    title: "Monthly Revenue",
    value: "$45.2K",
    change: "+18%",
    trend: "up",
    icon: DollarSign,
    color: "text-success",
  },
];

const recentActivity = [
  {
    client: "Acme Corp",
    action: "Uploaded tax documents",
    time: "2 minutes ago",
    status: "completed",
  },
  {
    client: "TechStart Inc",
    action: "Pending signature on engagement letter",
    time: "1 hour ago",
    status: "pending",
  },
  {
    client: "Global Ventures",
    action: "Monthly payroll processed",
    time: "3 hours ago",
    status: "completed",
  },
  {
    client: "Local Bakery Ltd",
    action: "VAT filing deadline approaching",
    time: "5 hours ago",
    status: "warning",
  },
];

const upcomingDeadlines = [
  { client: "Acme Corp", task: "Q1 Tax Filing", date: "Mar 15", priority: "high" },
  { client: "TechStart Inc", task: "Monthly Close", date: "Mar 18", priority: "medium" },
  { client: "Global Ventures", task: "Annual Report", date: "Mar 20", priority: "high" },
  { client: "Local Bakery Ltd", task: "Payroll Processing", date: "Mar 22", priority: "low" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <Button className="gap-2">
          <Users className="h-4 w-4" />
          Add New Client
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className={`h-4 w-4 ${
                    stat.trend === "up" ? "text-success" : 
                    stat.trend === "down" ? "text-accent" : "text-warning"
                  }`} />
                  <span className={`text-sm ${
                    stat.trend === "up" ? "text-success" : 
                    stat.trend === "down" ? "text-accent" : "text-warning"
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className={`h-2 w-2 rounded-full mt-2 ${
                    activity.status === "completed" ? "bg-success" :
                    activity.status === "pending" ? "bg-accent" : "bg-warning"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.client}</p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{deadline.client}</p>
                    <p className="text-sm text-muted-foreground">{deadline.task}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      deadline.priority === "high" ? "destructive" :
                      deadline.priority === "medium" ? "default" : "secondary"
                    }>
                      {deadline.date}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <CalendarWidget />
      </div>
    </div>
  );
};

export default Dashboard;
