import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailApi, EmailMessage, EmailAccount } from "@/api/email";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, RefreshCw, Send, Inbox, Archive, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";

export const EmailInbox: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/email/accounts"],
    queryFn: () => emailApi.fetchEmailAccounts(),
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/email/inbox", selectedAccountId],
    queryFn: () => emailApi.fetchInbox(selectedAccountId),
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: number) => emailApi.syncEmails(accountId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/inbox"] });
      toast({
        title: "Sync complete",
        description: `Fetched ${data.emailsFetched} new emails`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync emails",
        variant: "destructive",
      });
    },
  });

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Inbox</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your email accounts and messages</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedAccountId && (
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate(selectedAccountId)}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              Sync
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsAddAccountOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Add Account
          </Button>
          <Button onClick={() => setIsComposeOpen(true)} disabled={accounts.length === 0}>
            <Send className="w-4 h-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Email Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedAccountId?.toString() || "all"}
                onValueChange={(value) =>
                  setSelectedAccountId(value === "all" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.emailAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {accounts.length === 0 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  No email accounts configured
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Inbox</span>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <Archive className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Archived</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No messages found</p>
                  {selectedAccountId && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => syncMutation.mutate(selectedAccountId)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Emails
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        !message.isRead ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                      }`}
                      onClick={() => setSelectedMessage(message)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{message.fromAddress}</p>
                            {!message.isRead && (
                              <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {message.subject || "(No Subject)"}
                          </p>
                          {message.bodyText && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {message.bodyText.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                        <div className="ml-4 text-xs text-gray-500">
                          {dayjs(message.receivedAt).format("MMM D")}
                        </div>
                      </div>
                      {message.labels && message.labels.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {message.labels.map((label, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Compose Email Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogDescription>Send a new email message</DialogDescription>
          </DialogHeader>
          <ComposeEmailForm
            accounts={accounts}
            onClose={() => setIsComposeOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Email Account Dialog */}
      <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Email Account</DialogTitle>
            <DialogDescription>
              Connect your Gmail account using OAuth
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              To add a Gmail account, you'll need to authenticate with Google.
              This feature requires OAuth setup.
            </p>
            <Button onClick={() => {
              toast({
                title: "OAuth Setup Required",
                description: "Gmail OAuth integration needs to be configured on the server.",
              });
              setIsAddAccountOpen(false);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Gmail Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMessage.subject || "(No Subject)"}</DialogTitle>
              <DialogDescription>
                From: {selectedMessage.fromAddress} | 
                To: {selectedMessage.toAddresses.join(", ")}
                {selectedMessage.receivedAt && ` | ${dayjs(selectedMessage.receivedAt).format("MMM D, YYYY [at] h:mm A")}`}
              </DialogDescription>
            </DialogHeader>
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
                    {selectedMessage.attachments.map((att, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {att.name} ({(att.size / 1024).toFixed(2)} KB)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
              <Button onClick={() => {
                setIsComposeOpen(true);
                setSelectedMessage(null);
              }}>
                <Send className="w-4 h-4 mr-2" />
                Reply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Compose Email Form Component
const ComposeEmailForm: React.FC<{
  accounts: EmailAccount[];
  onClose: () => void;
}> = ({ accounts, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState<number | undefined>(accounts[0]?.id);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const sendMutation = useMutation({
    mutationFn: () => emailApi.sendEmail(
      accountId!,
      to.split(",").map(e => e.trim()),
      subject,
      body
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/inbox"] });
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully.",
      });
      onClose();
      setTo("");
      setSubject("");
      setBody("");
    },
    onError: (error: any) => {
      toast({
        title: "Send failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!accountId || !to || !subject || !body) {
          toast({
            title: "Validation error",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          return;
        }
        sendMutation.mutate();
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="account">From</Label>
        <Select
          value={accountId?.toString() || ""}
          onValueChange={(value) => setAccountId(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                {account.emailAddress}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          placeholder="Email subject"
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
        <Button type="submit" disabled={sendMutation.isPending}>
          {sendMutation.isPending ? "Sending..." : "Send"}
        </Button>
      </DialogFooter>
    </form>
  );
};

