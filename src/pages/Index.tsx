import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import brototypeLogo from '@/assets/brototype-logo.png';
import { ArrowRight, CheckCircle, Shield, Zap } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 animate-fade-in">
        <div className="container mx-auto px-4 text-center">
          <img src={brototypeLogo} alt="Brototype" className="h-24 mx-auto mb-8 hover-scale" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Brototype Connect
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Premium complaint management system for seamless communication between students and staff
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="gap-2 hover-scale"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="hover-scale"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Brototype Connect?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A modern, efficient way to manage and track complaints with real-time updates and transparency
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card p-8 rounded-lg shadow-card hover:shadow-card-hover transition-smooth hover-scale text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
            <p className="text-muted-foreground">
              Get instant notifications when your complaint status changes or receives updates
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-card hover:shadow-card-hover transition-smooth hover-scale text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Tracking</h3>
            <p className="text-muted-foreground">
              Track all your complaints in one place with detailed status updates and history
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-card hover:shadow-card-hover transition-smooth hover-scale text-center">
            <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-info" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Anonymous</h3>
            <p className="text-muted-foreground">
              Option to submit complaints anonymously while maintaining full security
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card border-y">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join Brototype Connect today and experience seamless complaint management
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="hover-scale"
          >
            Sign Up Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Brototype Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
