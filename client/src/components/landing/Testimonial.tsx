import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TestimonialProps {
    quote: string;
    author: string;
    title: string;
    company: string;
}

export const Testimonial = ({ quote, author, title, company }: TestimonialProps) => {
    const initials = author
        .split(" ")
        .map((n) => n[0])
        .join("");

    return (
        <Card className="h-full">
            <CardContent className="pt-6">
                <p className="text-lg italic mb-6">"{quote}"</p>
                <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{author}</p>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-sm text-muted-foreground">{company}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
