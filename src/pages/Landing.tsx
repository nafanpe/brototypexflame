import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/brototype-logo.png";
import heroParallax from "@/assets/hero-parallax.jpg";

const FadeInSection = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    navigate(user ? '/dashboard' : '/auth');
  };

  return (
    <div className="bg-black text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        {/* Subtle background animation */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear",
            }}
            style={{
              backgroundImage: "radial-gradient(circle at center, hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-center z-10"
        >
          <img src={logo} alt="Brototype Logo" className="w-24 h-24 mx-auto mb-8 opacity-90" />
          <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight">
            Brototype Connect
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
            A direct line. A clear voice.
          </p>
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="rounded-full px-8 py-6 text-lg font-semibold"
          >
            Get Started
          </Button>
        </motion.div>
      </section>

      {/* Problem Section */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <FadeInSection>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-bold mb-8">
              Move past the noise.
            </h2>
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
              In a high-performance environment, clarity is everything. The old way of managing 
              feedback—scattered messages, lost threads—is a blocker. We built a professional 
              tool for a professional community.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* Parallax Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${heroParallax})`,
              backgroundAttachment: "fixed",
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Content */}
        <FadeInSection delay={0.3}>
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-bold mb-8">
              Your voice, amplified.
            </h2>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
              Register, track, and resolve. 'Connect' is the single source of truth for the 
              entire community. From a flickering light to a critical bug, it's all here.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* Why Section */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <FadeInSection>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-bold mb-8">
              Built for the Brocamp.
            </h2>
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-8">
              Brototype is a 7-12 month intensive program that creates "real-world" developers. 
              This app mirrors that philosophy. It's not a toy; it's an enterprise-grade tool 
              for managing a high-performing campus.
            </p>
            <p className="text-lg md:text-xl text-gray-500 leading-relaxed">
              We hold our tools to the same standard we hold our code.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* Final CTA Section */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <FadeInSection delay={0.2}>
          <div className="text-center">
            <h2 className="text-5xl md:text-7xl font-bold mb-8">
              Ready to connect?
            </h2>
            <p className="text-lg md:text-xl text-gray-400 mb-12">
              Log in to view your dashboard or register a new complaint.
            </p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="rounded-full px-8 py-6 text-lg font-semibold"
            >
              Get Started
            </Button>
          </div>
        </FadeInSection>
      </section>

      {/* Fade to black at bottom */}
      <div className="h-32 bg-gradient-to-b from-transparent to-black" />
    </div>
  );
};

export default Landing;
