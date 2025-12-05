import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
    LandingNav,
    HeroSection,
    FeaturesSection,
    PricingSection,
    SocialProofSection,
    FAQSection,
    CTASection,
    Footer,
} from "@/components/landing";

const Landing = () => {
    const { user, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (!isLoading && user) {
            // Redirect authenticated users to dashboard
            setLocation("/dashboard");
        }
    }, [user, isLoading, setLocation]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <LandingNav />
            <HeroSection />
            <FeaturesSection />
            <PricingSection />
            <SocialProofSection />
            <FAQSection />
            <CTASection />
            <Footer />
        </div>
    );
};

export default Landing;
