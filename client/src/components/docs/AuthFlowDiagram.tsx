import { ArrowDown, Check, Lock, Shield, User, X } from "lucide-react";

export const AuthFlowDiagram = () => {
  return (
    <div className="space-y-8">
      {/* Authentication Flow */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Authentication Flow</h4>
        <div className="flex flex-col items-center gap-2">
          {/* Step 1 */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg w-full max-w-xl">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
            <div className="flex-1">
              <p className="font-medium">User Login</p>
              <p className="text-sm text-muted-foreground">Email/password submitted to Supabase Auth</p>
            </div>
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
          
          {/* Step 2 */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg w-full max-w-xl">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
            <div className="flex-1">
              <p className="font-medium">JWT Token Issued</p>
              <p className="text-sm text-muted-foreground">Contains user ID, stored in browser</p>
            </div>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
          
          {/* Step 3 */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg w-full max-w-xl">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
            <div className="flex-1">
              <p className="font-medium">Roles Fetched</p>
              <p className="text-sm text-muted-foreground">AuthProvider queries user_roles table</p>
            </div>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
          
          {/* Step 4 */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg w-full max-w-xl">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</div>
            <div className="flex-1">
              <p className="font-medium">Module Permissions Resolved</p>
              <p className="text-sm text-muted-foreground">Role defaults + user overrides merged</p>
            </div>
            <Check className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Protection Layers */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Protection Layers</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h5 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Frontend Routes</h5>
            <ul className="text-sm text-blue-700/80 dark:text-blue-400/80 space-y-1">
              <li>• <code className="text-xs bg-blue-500/20 px-1 rounded">ProtectedRoute</code> - Auth check</li>
              <li>• <code className="text-xs bg-blue-500/20 px-1 rounded">ProtectedModuleRoute</code> - Permission check</li>
              <li>• Sidebar filters hidden modules</li>
            </ul>
          </div>
          
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h5 className="font-medium text-green-700 dark:text-green-400 mb-2">API Layer</h5>
            <ul className="text-sm text-green-700/80 dark:text-green-400/80 space-y-1">
              <li>• JWT validation on every request</li>
              <li>• <code className="text-xs bg-green-500/20 px-1 rounded">auth.uid()</code> in policies</li>
              <li>• Edge function auth checks</li>
            </ul>
          </div>
          
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <h5 className="font-medium text-purple-700 dark:text-purple-400 mb-2">Database (RLS)</h5>
            <ul className="text-sm text-purple-700/80 dark:text-purple-400/80 space-y-1">
              <li>• <code className="text-xs bg-purple-500/20 px-1 rounded">has_role()</code> function</li>
              <li>• SELECT/INSERT/UPDATE/DELETE policies</li>
              <li>• Data filtered at query time</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Example RLS Policy */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Example RLS Policy</h4>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-foreground/80">
{`-- Users can only view their assigned clients
CREATE POLICY "Users view assigned clients"
ON public.clients FOR SELECT
USING (
  auth.uid() = assigned_owner_id OR
  auth.uid() = assigned_accountant_id OR
  auth.uid() = assigned_reviewer_id OR
  has_role(auth.uid(), 'admin')
);`}
          </pre>
        </div>
      </div>

      {/* Dual Portal Access */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Portal Access Logic</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-medium">Staff Portal Access</span>
            </div>
            <p className="text-sm text-muted-foreground">
              User has role in <code className="text-xs bg-muted px-1 rounded">user_roles</code> AND 
              profile has no <code className="text-xs bg-muted px-1 rounded">client_id</code>
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-medium">Client Portal Access</span>
            </div>
            <p className="text-sm text-muted-foreground">
              User has <code className="text-xs bg-muted px-1 rounded">client</code> role AND 
              profile has <code className="text-xs bg-muted px-1 rounded">client_id</code> set
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
