import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, Upload, CheckCircle2, Clock, DollarSign, 
  MessageSquare, Calendar, AlertCircle, LogOut 
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import dayjs from "dayjs";

export const ClientPortalDashboard: React.FC = () => {
  const [location, setLocation] = useLocation();
  const clientId = parseInt(sessionStorage.getItem("clientId") || "0");

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["/api/client-portal/dashboard", clientId],
    queryFn: async () => {
      return apiRequest(`/api/client-portal/dashboard?clientId=${clientId}`, {
        method: "GET",
      });
    },
    enabled: clientId > 0,
  });

  const handleLogout = () => {
    sessionStorage.removeItem("clientPortalToken");
    sessionStorage.removeItem("clientId");
    setLocation("/client-portal/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
              <p className="text-sm text-gray-500">
                {dashboard?.clientName || "Welcome"}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Pending Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.pendingTasks || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Tasks requiring your action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Required Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.requiredDocuments || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Documents to upload</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => setLocation("/client-portal/invoices")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Invoice Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard?.invoiceBalance ? `$${dashboard.invoiceBalance.toFixed(2)}` : "$0.00"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Outstanding amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Unread Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.unreadMessages || 0}</div>
              <p className="text-xs text-gray-500 mt-1">New messages</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>Tasks that require your attention</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.tasks && dashboard.tasks.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.tasks.slice(0, 5).map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                      onClick={() => setLocation(`/client-portal/tasks/${task.id}`)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {task.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {task.dueDate ? dayjs(task.dueDate).format("MMM D, YYYY") : "No due date"}
                        </p>
                      </div>
                      <Badge variant={task.priority === "urgent" ? "destructive" : "secondary"}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No pending tasks</p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setLocation("/client-portal/tasks")}
              >
                View All Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Required Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>Documents you need to upload</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.documents && dashboard.documents.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.documents.slice(0, 5).map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            {doc.category} • Due: {doc.dueDate ? dayjs(doc.dueDate).format("MMM D, YYYY") : "No due date"}
                          </p>
                        </div>
                      </div>
                      {doc.isUploaded ? (
                        <Badge variant="default">Uploaded</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/client-portal/documents/upload/${doc.id}`)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No documents required</p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setLocation("/client-portal/documents")}
              >
                View All Documents
              </Button>
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Latest communication from your team</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.messages && dashboard.messages.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.messages.slice(0, 5).map((message: any) => (
                    <div
                      key={message.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                      onClick={() => setLocation("/client-portal/messages")}
                    >
                      <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{message.subject || "(No Subject)"}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {message.bodyText || message.bodyHtml?.replace(/<[^>]*>/g, "") || "No content"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {dayjs(message.receivedAt).format("MMM D, YYYY [at] h:mm A")}
                        </p>
                      </div>
                      {!message.isRead && (
                        <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No messages</p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  if (selectedMessage) {
                    setSelectedMessage(null);
                  }
                  setLocation("/client-portal/messages");
                }}
              >
                View All Messages
              </Button>
            </CardContent>
          </Card>

          {/* Workflow Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Progress</CardTitle>
              <CardDescription>Current onboarding and workflow status</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.workflows && dashboard.workflows.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.workflows.map((workflow: any) => (
                    <div key={workflow.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{workflow.name}</span>
                        <span className="text-sm text-gray-500">
                          {workflow.completedSteps} / {workflow.totalSteps}
                        </span>
                      </div>
                      <Progress value={workflow.progress} className="h-2" />
                      <p className="text-xs text-gray-500">
                        {workflow.currentStage || "Not started"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No active workflows</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

