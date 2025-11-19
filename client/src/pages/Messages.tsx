import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MessageSquare } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import { NewConversationDialog } from "@/components/messages/NewConversationDialog";
import { useConversations } from "@/hooks/useMessages";

export default function Messages() {
    const { data: conversations = [], isLoading } = useConversations();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
        conversations.length > 0 ? conversations[0].id : null
    );
    const [showNewDialog, setShowNewDialog] = useState(false);

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    const getConversationTitle = (conv: any) => {
        if (conv.title) return conv.title;
        if (conv.client) return conv.client.name;
        if (conv.participants && conv.participants.length > 0) {
            return conv.participants.map((p: any) => p.full_name).join(", ");
        }
        return "Conversation";
    };

    // Auto-select first conversation when data loads
    if (!selectedConversationId && conversations.length > 0) {
        setSelectedConversationId(conversations[0].id);
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Team communication and client messaging
                    </p>
                </div>
                <Button onClick={() => setShowNewDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Conversation
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <ConversationList
                            conversations={conversations}
                            selectedId={selectedConversationId}
                            onSelect={setSelectedConversationId}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        {selectedConversation ? (
                            <MessageThread
                                conversationId={selectedConversation.id}
                                conversationTitle={getConversationTitle(selectedConversation)}
                            />
                        ) : (
                            <Card className="h-[calc(100vh-12rem)] flex items-center justify-center">
                                <CardContent>
                                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-muted-foreground text-center">
                                        Select a conversation to start messaging
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            <NewConversationDialog
                open={showNewDialog}
                onOpenChange={setShowNewDialog}
            />
        </div>
    );
}
