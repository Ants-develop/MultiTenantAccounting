import { PricingCard } from "./PricingCard";

export const PricingSection = () => {
    const pricingTiers = [
        {
            name: "Starter",
            price: "$49",
            description: "Perfect for solo practitioners and small firms",
            features: [
                "Up to 25 active clients",
                "1 team member",
                "Basic workflows",
                "5GB storage",
                "Email support",
                "Client portal access",
                "Standard reporting"
            ],
            ctaText: "Start Free Trial"
        },
        {
            name: "Professional",
            price: "$149",
            description: "For growing practices that need more power",
            features: [
                "Up to 100 active clients",
                "5 team members",
                "Advanced workflows & automation",
                "50GB storage",
                "Priority support",
                "Custom branding",
                "Advanced reporting & analytics",
                "All Starter features"
            ],
            isPopular: true,
            ctaText: "Start Free Trial"
        },
        {
            name: "Enterprise",
            price: "Custom",
            description: "For large firms with complex needs",
            features: [
                "Unlimited clients",
                "Unlimited team members",
                "Custom workflows",
                "Unlimited storage",
                "Dedicated support & onboarding",
                "API access",
                "SSO & advanced security",
                "White-label options",
                "All Professional features"
            ],
            ctaText: "Contact Sales"
        }
    ];

    return (
        <section id="pricing" className="py-20 px-4">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Choose the plan that's right for your practice. All plans include a 14-day free trial.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {pricingTiers.map((tier, index) => (
                        <PricingCard key={index} {...tier} />
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-muted-foreground">
                        All plans include SSL security, automatic backups, and 99.9% uptime guarantee
                    </p>
                </div>
            </div>
        </section>
    );
};
