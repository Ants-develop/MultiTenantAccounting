import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQSection = () => {
    const faqs = [
        {
            question: "How does the free trial work?",
            answer: "Start with a 14-day free trial of any plan with full access to all features. No credit card required. You can cancel anytime during the trial with no charges."
        },
        {
            question: "Can I change plans later?",
            answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges or credits to your account."
        },
        {
            question: "Is my data secure?",
            answer: "Absolutely. We use bank-level encryption, secure data centers, and comply with all major security standards including SOC 2 Type II. Your data is encrypted both in transit and at rest."
        },
        {
            question: "How does client onboarding work?",
            answer: "Import clients from spreadsheets, integrate with your existing systems, or add them manually. Each client can be invited to their secure portal where they can access documents and communicate with your team."
        },
        {
            question: "Do you offer training and support?",
            answer: "Yes! All plans include comprehensive documentation and video tutorials. Professional and Enterprise plans include priority support and dedicated onboarding assistance."
        },
        {
            question: "Can I migrate from my current system?",
            answer: "We provide migration assistance for all paid plans. Our team will help you import your existing data, set up workflows, and train your staff to ensure a smooth transition."
        },
        {
            question: "What integrations do you support?",
            answer: "AccountFlow Pro integrates with popular accounting software, calendar applications, and productivity tools. Enterprise plans include API access for custom integrations."
        },
        {
            question: "Is there a setup fee?",
            answer: "No setup fees for any plan. Start your free trial and be up and running in minutes. Enterprise plans include complimentary setup and onboarding assistance."
        }
    ];

    return (
        <section id="faq" className="py-20 px-4 bg-muted/30">
            <div className="container mx-auto max-w-3xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-xl text-muted-foreground">
                        Everything you need to know about AccountFlow Pro
                    </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-left text-lg">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-base text-muted-foreground">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
};
