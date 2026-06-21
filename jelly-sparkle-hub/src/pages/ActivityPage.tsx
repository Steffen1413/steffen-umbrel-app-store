import { useState, useEffect } from "react";
import { useJellyfin } from "@/contexts/JellyfinContext";
import { getSessions, type JellyfinSession } from "@/lib/jellyfin";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Activity, Loader2, Tv, Clock } from "lucide-react";

function anonymizeUser(username: string, userMap: Map<string, number>): string {
  if (!userMap.has(username)) {
    userMap.set(username, userMap.size + 1);
  }
  return `Nutzer ${userMap.get(username)}`;
}

const ActivityPage = () => {
  const { config } = useJellyfin();
  const [sessions, setSessions] = useState<JellyfinSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config) return;
    const load = async () => {
      try {
        const data = await getSessions(config);
        setSessions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [config]);

  if (!config) return null;

  const userMap = new Map<string, number>();
  const activeSessions = sessions.filter((s) => s.NowPlayingItem);
  const recentSessions = sessions
    .filter((s) => !s.NowPlayingItem && s.LastActivityDate)
    .sort((a, b) => new Date(b.LastActivityDate!).getTime() - new Date(a.LastActivityDate!).getTime())
    .slice(0, 10);

  return (
    <>
      <Navbar />
      <main className="pt-16 pb-20 md:pb-8 container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8 pt-4">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Was läuft gerade?</h1>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Schaue nach, wer gerade auf der Couch sitzt…</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Currently Watching */}
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Gerade am Schauen</h2>
                {activeSessions.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center">
                    <Tv className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Gerade schaut niemand – perfekter Moment, um den Fernseher für dich zu beanspruchen! 📺</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeSessions.map((session) => (
                      <div key={session.Id} className="glass rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Tv className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm">
                            {anonymizeUser(session.UserName, userMap)}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            Schaut gerade: {session.NowPlayingItem?.Name}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Live
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Activity */}
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Letzte Aktivität</h2>
                {recentSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Keine Aktivität in letzter Zeit – alle wohl draußen unterwegs? 🌤️
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentSessions.map((session) => (
                      <div key={session.Id} className="glass rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm">
                            {anonymizeUser(session.UserName, userMap)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Zuletzt aktiv: {new Date(session.LastActivityDate!).toLocaleString("de-DE")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </motion.div>
      </main>
    </>
  );
};

export default ActivityPage;
