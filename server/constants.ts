// Main company ID constant
// The main company (ID 1 by default) represents the single company running this accounting system
// Main company profile is configured via CompanyProfile.tsx
// Initial setup is done via SetupWizard component
export const DEFAULT_CLIENT_ID = parseInt(process.env.DEFAULT_CLIENT_ID || '1');

