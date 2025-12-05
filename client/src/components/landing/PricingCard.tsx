import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "wouter";

interface PricingCardProps {
    name: string;
    price: string;
    description: string;
    features: string[];
    isPopular?: boolean;
    ctaText: string;
}

export const PricingCard = ({
    name,
    price,
    description,
    features,
    isPopular = false,
    ctaText,
}: PricingCardProps) => {
    return (
        <Card className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-xl ${isPopular ? "border-primary shadow-lg scale-105" : ""}`}>
            {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                </div>
            )}
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
                <div className="mt-4">
                    <span className="text-4xl font-bold">{price}</span>
                    {price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <ul className="space-y-3">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full" variant={isPopular ? "default" : "outline"}>
                    <Link href="/login">{ctaText}</Link>
                </Button>
            </CardFooter>
        </Card>
    );
};
