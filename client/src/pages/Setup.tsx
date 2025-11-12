import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import SetupWizard from "@/components/setup/SetupWizard";

export default function Setup() {
  const { user, needsSetup, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If setup is complete, redirect to home
    if (!isLoading && !needsSetup) {
      setLocation("/home");
    }
    // If not logged in, redirect to login
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, needsSetup, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !needsSetup) {
    return null; // Will redirect via useEffect
  }

  return (
    <SetupWizard
      onComplete={() => {
        // Redirect to home after setup completes
        setLocation("/home");
      }}
    />
  );
}

