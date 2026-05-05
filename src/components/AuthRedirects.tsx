import { PropsWithChildren } from "react";

// Self-hosted single-user mode: no auth, always pass through.
export const RedirectIfNotLoggedIn = ({ children }: PropsWithChildren) => <>{children}</>;
export const RedirectIfSignedIn = ({ children }: PropsWithChildren) => <>{children}</>;
