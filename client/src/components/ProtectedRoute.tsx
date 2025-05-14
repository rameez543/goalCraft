import React from "react";
import { useAuth } from "../hooks/use-auth";
import { Redirect, Route } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  path,
  component: Component,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  return (
    <Route
      path={path}
      component={() => {
        if (!user) {
          return <Redirect to="/auth" />;
        }
        return <Component />;
      }}
    />
  );
};