import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Mail,
  Phone,
  Building,
  Calendar,
  User,
  History,
  Settings,
} from "lucide-react";
import { useUserProfile, useUserMessageHistory } from "@/hooks/useUserProfiles";
import { format } from "date-fns";

interface UserProfileDialogProps {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendMessage?: (userId: number) => void;
}

export function UserProfileDialog({
  userId,
  open,
  onOpenChange,
  onSendMessage,
}: UserProfileDialogProps) {
  const [activeTab, setActiveTab] = useState("profile");
  
  const { data: userProfile, isLoading } = useUserProfile(userId || undefined);
  const { data: messageHistory } = useUserMessageHistory(userId || undefined);

  if (!userId) return null;

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading profile...</div>
          </div>
        ) : userProfile ? (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={userProfile.avatarUrl} />
                <AvatarFallback className="text-lg">
                  {getInitials(userProfile.displayName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{userProfile.displayName}</h3>
                <p className="text-muted-foreground">@{userProfile.username}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={userProfile.isActive ? "default" : "secondary"}>
                    {userProfile.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {userProfile.globalRole && (
                    <Badge variant="outline">{userProfile.globalRole}</Badge>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => onSendMessage?.(userId)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="messages">
                  <History className="h-4 w-4 mr-2" />
                  Message History
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Calendar className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{userProfile.email}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Full Name
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{userProfile.fullName || "Not set"}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Username
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>@{userProfile.username}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Status
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {userProfile.isActive ? "Active User" : "Inactive User"}
                        </span>
                      </div>
                    </div>

                    {userProfile.globalRole && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Role
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">
                            {userProfile.globalRole.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Message History Tab */}
              <TabsContent value="messages" className="space-y-4">
                <ScrollArea className="h-[300px] pr-4">
                  {messageHistory && messageHistory.length > 0 ? (
                    <div className="space-y-3">
                      {messageHistory.map((msg: any) => (
                        <div
                          key={msg.id}
                          className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium">
                              {format(new Date(msg.created_at), "PPp")}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {msg.message_type || "text"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {msg.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No message history with this user
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={() => onSendMessage?.(userId)}
                      >
                        Start Conversation
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Activity tracking coming soon
                    </p>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">User not found</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
