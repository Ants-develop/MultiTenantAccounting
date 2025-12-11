import React from "react";
import { ClientProfile } from "@/pages/clients/ClientProfile";
import { useRoute } from "wouter";

interface ClientDetailProps {
  id?: string | number;
  params?: { id: string };
}

export default function ClientDetail(props: ClientDetailProps) {
  // Handle both wouter params and direct props (from FlexLayout)
  const [match, params] = useRoute("/clients/:id");
  
  const clientId = props.id 
    ? Number(props.id) 
    : (params?.id ? Number(params.id) : (props.params?.id ? Number(props.params.id) : null));

  if (!clientId) {
    return <div className="p-6 text-center text-muted-foreground">Invalid Client ID</div>;
  }

  return <ClientProfile clientId={clientId} />;
}
