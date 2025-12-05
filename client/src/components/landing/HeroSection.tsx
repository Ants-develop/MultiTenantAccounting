import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, CheckCircle } from "lucide-react";

export const HeroSection = () => {
    return (
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />

            <div className="container mx-auto relative">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 animate-fade-in">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Trusted by 500+ accounting firms</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in">
                        The Complete Practice Management Platform for{" "}
                        <span className="text-primary">Modern Accounting Firms</span>
                    </h1>

                    <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
                        Automate workflows, collaborate seamlessly, and delight your clients with AccountFlow Pro's all-in-one platform built specifically for accounting professionals.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in">
                        <Button asChild size="lg" className="text-lg px-8">
                            <Link href="/login">
                                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => document.getElementById("pricing")?.scrollIntoView({
                            behavior: "smooth"
                        })}>
                            View Pricing
                        </Button>
                    </div>

                    <p className="text-sm text-muted-foreground animate-fade-in">
                        No credit card required • 14-day free trial • Cancel anytime
                    </p>
                </div>

                <div className="mt-16 max-w-5xl mx-auto animate-fade-in">
                    <div className="rounded-lg border bg-card shadow-2xl overflow-hidden">
                        {/* Dashboard preview placeholder */}
                        <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                            <p className="text-muted-foreground">Dashboard Preview</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
