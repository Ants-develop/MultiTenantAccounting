import { Link } from "wouter";

export const Footer = () => {
    return (
        <footer className="bg-muted py-12 px-4">
            <div className="container mx-auto">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-8 h-8 bg-primary rounded-lg" />
                            <span className="text-xl font-bold">AccountFlow Pro</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            The complete practice management platform for modern accounting firms.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4">Product</h3>
                        <ul className="space-y-2 text-sm">
                            <li><button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="text-muted-foreground hover:text-foreground transition-colors">Features</button></li>
                            <li><button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="text-muted-foreground hover:text-foreground transition-colors">Pricing</button></li>
                            <li><Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4">Support</h3>
                        <ul className="space-y-2 text-sm">
                            <li><button onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })} className="text-muted-foreground hover:text-foreground transition-colors">FAQ</button></li>
                            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
                            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact Support</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Security</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t pt-8">
                    <p className="text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} AccountFlow Pro. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};
