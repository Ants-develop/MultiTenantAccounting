import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
    return (
        <section className="py-20 px-4">
            <div className="container mx-auto">
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-2xl p-12 md:p-16 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Ready to Transform Your Practice?
                    </h2>
                    <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                        Join hundreds of accounting firms who have streamlined their operations with AccountFlow Pro.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button asChild size="lg" className="text-lg px-8">
                            <Link href="/login">
                                Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
                            View Pricing
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-6">
                        No credit card required • 14-day free trial • Cancel anytime
                    </p>
                </div>
            </div>
        </section>
    );
};
