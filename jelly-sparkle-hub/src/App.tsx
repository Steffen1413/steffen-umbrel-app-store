import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { JellyfinProvider, useJellyfin } from "@/contexts/JellyfinContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Genre from "./pages/Genre";
import Discover from "./pages/Discover";
import RandomMovie from "./pages/RandomMovie";
import ActivityPage from "./pages/ActivityPage";
import TrendsPage from "./pages/TrendsPage";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useJellyfin();
  if (isLoading) return null;
  if (!isAuthenticated) return <Login />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <JellyfinProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthGate>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/genre/:genre" element={<Genre />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/random" element={<RandomMovie />} />
                
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/trends" element={<TrendsPage />} />
                
                <Route path="/search" element={<SearchPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthGate>
          </BrowserRouter>
        </TooltipProvider>
      </JellyfinProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
