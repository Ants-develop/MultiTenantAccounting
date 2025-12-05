import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export const LandingNav = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg" />
            <span className="text-xl font-bold">AccountFlow Pro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection("features")} className="text-foreground/80 hover:text-foreground transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection("pricing")} className="text-foreground/80 hover:text-foreground transition-colors">
              Pricing
            </button>
            <button onClick={() => scrollToSection("faq")} className="text-foreground/80 hover:text-foreground transition-colors">
              FAQ
            </button>
            <Link href="/login" className="text-foreground/80 hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/client-portal/login" className="text-foreground/80 hover:text-foreground transition-colors">
              Client Portal
            </Link>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 animate-fade-in">
            <button
              onClick={() => scrollToSection("features")}
              className="block w-full text-left px-4 py-2 text-foreground/80 hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="block w-full text-left px-4 py-2 text-foreground/80 hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="block w-full text-left px-4 py-2 text-foreground/80 hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              FAQ
            </button>
            <Link
              href="/login"
              className="block w-full text-left px-4 py-2 text-foreground/80 hover:text-foreground hover:bg-accent rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/client-portal/login"
              className="block w-full text-left px-4 py-2 text-foreground/80 hover:text-foreground hover:bg-accent rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Client Portal
            </Link>
            <Button asChild className="w-full">
              <Link href="/login" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};
