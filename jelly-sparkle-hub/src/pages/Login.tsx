import { useState } from "react";
import { useJellyfin } from "@/contexts/JellyfinContext";
import { motion } from "framer-motion";
import { Loader2, User, Lock } from "lucide-react";

const LOADING_QUOTES = [
  "Popcorn wird vorbereitet…",
  "Filmrolle wird eingelegt…",
  "Beamer heizt auf…",
  "Licht wird gedimmt…",
];

const Login = () => {
  const { login } = useJellyfin();
  const serverUrl = "https://jellyfin.steffen-spielmann.de";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingQuote] = useState(() => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      localStorage.setItem("jellyfin_server_url", serverUrl);
      await login(serverUrl, username, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Invalid username")) {
        setError("Falscher Benutzername oder Passwort – versuch's nochmal! 🎬");
      } else {
        setError("Verbindung fehlgeschlagen – ist der Server erreichbar? 🤔");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">Discovery Hub</h1>
          <p className="text-muted-foreground">Melde dich an und entdecke deinen nächsten Lieblingsfilm 🍿</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4 shadow-elevated">



          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Benutzername</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Dein Jellyfin-Benutzername"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dein Passwort"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm text-center">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? loadingQuote : "Einloggen"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Gebaut mit Herzblut für Filmfans 🎥
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
