import React, { createContext, PropsWithChildren } from "react";

// Stub user — single-user self-hosted mode, no auth required.
const LOCAL_USER = { uid: "local", isAnonymous: false };

type LocalUser = typeof LOCAL_USER;

interface UserContextInterface {
  user: LocalUser | null;
  setUser: (user: LocalUser) => void;
}

export const UserContext = createContext<UserContextInterface>({
  user: LOCAL_USER,
  setUser: () => undefined,
});

export const UserProvider = ({ children }: PropsWithChildren) => {
  const memoizedValue = React.useMemo(
    () => ({ user: LOCAL_USER, setUser: () => undefined }),
    [],
  );

  return (
    <UserContext.Provider value={memoizedValue}>
      {children}
    </UserContext.Provider>
  );
};
