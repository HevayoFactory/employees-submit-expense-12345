import { useEffect, useState } from "react";
import { currentUser } from "./authz/session";

export interface Profile {
  name: string;
  email: string;
}

/** The signed-in user's name and email from the ID token (there is no username claim). */
export function useProfile(): Profile {
  const [profile, setProfile] = useState<Profile>({ name: "", email: "" });
  useEffect(() => {
    let live = true;
    void currentUser().then((user) => {
      if (!live || !user) return;
      const p = user.profile as Record<string, unknown>;
      const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
      const email = str("email");
      setProfile({ name: str("name") || email || str("sub"), email });
    });
    return () => {
      live = false;
    };
  }, []);
  return profile;
}
