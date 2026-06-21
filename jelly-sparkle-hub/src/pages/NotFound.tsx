import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-2 text-xl text-muted-foreground">
          Diese Seite ist verschollen – wie eine verlorene Filmrolle 🎞️
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Vielleicht hat sie sich in einem Regallücke versteckt?
        </p>
        <a href="/" className="text-primary font-semibold underline hover:text-primary/90">
          Zurück zur Startseite
        </a>
      </div>
    </div>
  );
};

export default NotFound;
