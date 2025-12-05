import { Testimonial } from "./Testimonial";

export const SocialProofSection = () => {
    const testimonials = [
        {
            quote: "AccountFlow Pro transformed how we manage our practice. We've reduced administrative time by 50% and our clients love the portal access.",
            author: "Sarah Johnson",
            title: "Managing Partner",
            company: "Johnson & Associates CPA"
        },
        {
            quote: "The workflow automation alone paid for itself in the first month. We can now handle twice as many clients without adding staff.",
            author: "Michael Chen",
            title: "Founder",
            company: "Chen Tax Services"
        },
        {
            quote: "Best investment we've made for our practice. The team collaboration features keep everyone on the same page, and clients appreciate the transparency.",
            author: "Emily Rodriguez",
            title: "Senior Partner",
            company: "Rodriguez & Partners"
        }
    ];

    const stats = [
        { value: "500+", label: "Accounting Firms" },
        { value: "50%", label: "Time Saved" },
        { value: "98%", label: "Client Satisfaction" },
        { value: "99.9%", label: "Uptime" }
    ];

    return (
        <section className="py-20 px-4">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Trusted by Accounting Professionals
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        See what our customers have to say about AccountFlow Pro
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {testimonials.map((testimonial, index) => (
                        <Testimonial key={index} {...testimonial} />
                    ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                    {stats.map((stat, index) => (
                        <div key={index} className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                                {stat.value}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
