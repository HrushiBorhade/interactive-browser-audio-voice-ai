"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";

interface GitHubUser {
  avatar_url: string;
  name: string;
  login: string;
  bio: string | null;
}

export function GitHubHoverCard({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const fetchedRef = useRef(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !fetchedRef.current) {
        fetchedRef.current = true;
        fetch(`https://api.github.com/users/${username}`)
          .then((r) => r.json())
          .then((data) => setUser(data))
          .catch(() =>
            setUser({
              login: username,
              name: username,
              avatar_url: `https://github.com/${username}.png`,
              bio: null,
            })
          );
      }
    },
    [username]
  );

  return (
    <HoverCard openDelay={300} closeDelay={150} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" sideOffset={10} className="w-72">
        {user ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar_url}
                alt={user.name}
                width={44}
                height={44}
                className="rounded-full border border-foreground/[0.06]"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-foreground/80 truncate">
                    {user.name}
                  </p>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="shrink-0 text-foreground/25"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <p className="text-[11px] text-foreground/35 font-mono">
                  @{user.login}
                </p>
              </div>
            </div>

            {user.bio ? (
              <p className="text-[12px] text-foreground/45 leading-relaxed line-clamp-2">
                {user.bio}
              </p>
            ) : null}

            {/* Contribution graph */}
            <img
              src={`https://ghchart.rshah.org/${username}`}
              alt={`${username}'s GitHub contributions`}
              width={722}
              height={112}
              className="contribution-graph"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-foreground/[0.06]" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 rounded-md bg-foreground/[0.06]" />
                <div className="h-2.5 w-20 rounded-md bg-foreground/[0.04]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-md bg-foreground/[0.04]" />
              <div className="h-2.5 w-3/4 rounded-md bg-foreground/[0.04]" />
            </div>
            <div className="h-[37px] w-full rounded bg-foreground/[0.04]" />
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
