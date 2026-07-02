"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Info, Award, Ticket, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Notification } from "@/types/database";

interface Props {
  notifications: Notification[];
  userId: string;
}

const TYPE_ICON: Record<string, { icon: any; color: string }> = {
  registration: { icon: Calendar, color: "#FF6B35" },
  ticket: { icon: Ticket, color: "#7C3AED" },
  certificate: { icon: Award, color: "#10B981" },
  payment: { icon: Info, color: "#F59E0B" },
  info: { icon: Info, color: "#3B82F6" },
};

export function NotificationsClient({ notifications: initial, userId }: Props) {
  const [notifications, setNotifications] = useState(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast({ title: "All notifications marked as read." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={loading} className="gap-2">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No notifications yet</h3>
          <p className="text-sm text-muted-foreground">You'll see updates about your registrations and events here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, idx) => {
            const typeConfig = TYPE_ICON[notif.type] ?? TYPE_ICON.info;
            const Icon = typeConfig.icon;

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:card-shadow-hover",
                    !notif.read && "border-l-4 bg-primary/[0.02]"
                  )}
                  style={!notif.read ? { borderLeftColor: typeConfig.color } : {}}
                  onClick={() => markRead(notif.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${typeConfig.color}18` }}>
                        <Icon className="h-4.5 w-4.5" style={{ color: typeConfig.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn("text-sm font-semibold", notif.read ? "text-foreground" : "text-foreground")}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        {notif.body && (
                          <p className="text-sm text-muted-foreground mt-0.5">{notif.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5">{formatTimeAgo(notif.created_at)}</p>
                      </div>
                      {notif.link && (
                        <Link href={notif.link} onClick={(e) => e.stopPropagation()} className="shrink-0 text-primary hover:text-primary/80">
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
