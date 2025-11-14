import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ArrowLeft, Send, Reply } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import dayjs from "dayjs";

export const ClientPortalMessages: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const clientId = parseInt(sessionStorage.getItem("clientId") || "0");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/client-portal/messages", clientId],
    queryFn: async () => {
      return apiRequest(`/api/client-portal/messages?clientId=${clientId}`, {
        method: "GET",
      });
    },
    enabled: clientId > 0,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      // TODO: Implement message sending via email API
      return apiRequest("/api/client-portal/messages/send", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/dashboard"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      setIsComposeOpen(false);
      setReplyTo(null);
    },
    onError: (error: any) => {
      toast({
        title: "Send failed",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const unreadCount = messages.filter((m: any) => !m.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setLocation("/client-portal/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <p className="text-sm text-gray-500">Communicate with your team</p>
              </div>
            </div>
            <Button onClick={() => setIsComposeOpen(true)}>
              <Send className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>
                  {unreadCount > 0 && (
                    <Badge variant="default" className="mt-2">
                      {unreadCount} unread
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No messages</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message: any) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                          !message.isRead ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                        } ${selectedMessage?.id === message.id ? "ring-2 ring-blue-500" : ""}`}
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {message.fromAddress || "System"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {message.subject || "(No Subject)"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {dayjs(message.receivedAt).format("MMM D, YYYY")}
                            </p>
                          </div>
                          {!message.isRead && (
                            <Badge variant="default" className="h-2 w-2 p-0 rounded-full ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedMessage.subject || "(No Subject)"}</CardTitle>
                      <CardDescription>
                        From: {selectedMessage.fromAddress} | 
                        To: {selectedMessage.toAddresses?.join(", ") || "N/A"} |
                        {selectedMessage.receivedAt && ` ${dayjs(selectedMessage.receivedAt).format("MMM D, YYYY [at] h:mm A")}`}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyTo(selectedMessage);
                        setIsComposeOpen(true);
                      }}
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedMessage.bodyHtml ? (
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{selectedMessage.bodyText || "No content"}</p>
                    )}
                    {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Attachments</h4>
                        <div className="space-y-1">
                          {selectedMessage.attachments.map((att: any, idx: number) => (
                            <div key={idx} className="text-sm text-gray-600">
                              {att.name} ({(att.size / 1024).toFixed(2)} KB)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Select a message to view</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Compose Message Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{replyTo ? "Reply" : "New Message"}</DialogTitle>
            <DialogDescription>
              {replyTo ? `Reply to ${replyTo.fromAddress}` : "Send a message to your team"}
            </DialogDescription>
          </DialogHeader>
          <ComposeMessageForm
            replyTo={replyTo}
            onClose={() => {
              setIsComposeOpen(false);
              setReplyTo(null);
            }}
            onSend={sendMessageMutation.mutate}
            isSending={sendMessageMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Compose Message Form Component
const ComposeMessageForm: React.FC<{
  replyTo: any;
  onClose: () => void;
  onSend: (data: { to: string; subject: string; body: string }) => void;
  isSending: boolean;
}> = ({ replyTo, onClose, onSend, isSending }) => {
  const [to, setTo] = useState(replyTo?.fromAddress || "");
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject || ""}` : "");
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) {
      return;
    }
    onSend({ to, subject, body });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="email@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Message subject"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder="Your message here..."
          required
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSending}>
          {isSending ? "Sending..." : "Send"}
        </Button>
      </DialogFooter>
    </form>
  );
};

