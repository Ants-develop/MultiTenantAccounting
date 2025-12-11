import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderPlus, Plus, Search, Lock } from "lucide-react";
import {
  usePasswords,
  usePasswordFolders,
  useDeletePassword,
  useDeletePasswordFolder,
} from "@/hooks/usePasswords";
import { PasswordFolder } from "@/hooks/usePasswords";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const Passwords = () => {
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedFolder, setSelectedFolder] = useState<PasswordFolder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletePasswordId, setDeletePasswordId] = useState<string | null>(null);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["clients-for-passwords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: folders, isLoading: foldersLoading } = usePasswordFolders(
    selectedClientId === "all" ? undefined : selectedClientId
  );

  const { data: passwords, isLoading: passwordsLoading } = usePasswords(
    selectedFolder?.id,
    searchTerm
  );

  const deletePassword = useDeletePassword();

  const handleDeletePassword = async () => {
    if (deletePasswordId) {
      try {
        await deletePassword.mutateAsync(deletePasswordId);
        setDeletePasswordId(null);
        toast.success("Password deleted");
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const renderFolderTree = (folder: PasswordFolder, level = 0) => {
    return (
      <div key={folder.id}>
        <button
          onClick={() => setSelectedFolder(folder)}
          className={`w-full text-left px-2 py-1 rounded text-sm ${
            selectedFolder?.id === folder.id
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100"
          }`}
        >
          {'  '.repeat(level)}📁 {folder.name}
        </button>
        {folder.children?.map((child) => renderFolderTree(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Lock className="h-8 w-8" />
            Password Management
          </h1>
          <p className="text-muted-foreground">
            Securely manage client passwords and credentials
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Sidebar - Folder Tree */}
        <Card className="w-80 flex flex-col">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="space-y-4 mb-4">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                disabled={selectedClientId === "all"}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {foldersLoading ? (
                <div className="text-sm text-muted-foreground">Loading folders...</div>
              ) : folders && folders.length > 0 ? (
                <div className="space-y-1">
                  {folders.map((folder) => renderFolderTree(folder))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {selectedClientId === "all"
                    ? "Select a client to view folders"
                    : "No folders yet"}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content - Passwords */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search passwords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button disabled={!selectedFolder}>
              <Plus className="h-4 w-4 mr-2" />
              Add Password
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            {!selectedFolder ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Select a folder to view passwords
                </CardContent>
              </Card>
            ) : passwordsLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading passwords...
              </div>
            ) : passwords && passwords.length > 0 ? (
              <div className="space-y-2">
                {passwords.map((pwd) => (
                  <Card key={pwd.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{pwd.title}</h3>
                        {pwd.username && (
                          <p className="text-sm text-muted-foreground">
                            {pwd.username}
                          </p>
                        )}
                        {pwd.url && (
                          <p className="text-sm text-blue-500 hover:underline cursor-pointer">
                            {pwd.url}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletePasswordId(pwd.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No passwords in this folder
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deletePasswordId}
        onOpenChange={(open) => !open && setDeletePasswordId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Password</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The password will be archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePassword} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Passwords;
