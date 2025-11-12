import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import logo from "@/assets/brototype-logo.png";

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
  const heroRef = useRef(null);
  const horizontalRef = useRef(null);

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const { scrollYProgress: horizontalScrollProgress } = useScroll({
    target: horizontalRef,
    offset: ["start start", "end end"]
  });

  const heroRotateX = useTransform(heroScrollProgress, [0, 1], [0, 15]);
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 0.9]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.5, 1], [1, 0.8, 0.3]);

  const horizontalX = useTransform(horizontalScrollProgress, [0, 1], ["0%", "-200%"]);

  const handleGetStarted = () => {
    navigate(user ? '/dashboard' : '/auth');
  };

  return (
    <div className="bg-black text-white" style={{ perspective: "1200px" }}>
      {/* Section 1: The Hero with 3D Perspective */}
      <motion.section 
        ref={heroRef}
        className="min-h-screen flex flex-col items-center justify-center px-6 relative"
        style={{
          rotateX: heroRotateX,
          scale: heroScale,
          opacity: heroOpacity,
          transformStyle: "preserve-3d",
        }}
      >
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
      </motion.section>

      {/* Section 2: Chaos to Clarity Story */}
      <section className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <FadeInSection>
          <div className="max-w-5xl mx-auto">
            {/* Discord Bubbles Animation */}
            <div className="relative mb-12 h-[500px] flex items-center justify-center">
              {/* Chaotic Discord-style bubbles */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative w-full h-full">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute bg-gray-800 rounded-lg p-4 shadow-lg"
                      initial={{ 
                        x: (Math.random() - 0.5) * 600,
                        y: (Math.random() - 0.5) * 300,
                        opacity: 0,
                        rotate: (Math.random() - 0.5) * 30
                      }}
                      whileInView={{ 
                        x: 0,
                        y: 0,
                        opacity: [0, 1, 1, 0],
                        rotate: 0,
                        scale: [0.5, 1, 1, 0.3]
                      }}
                      transition={{ 
                        duration: 2,
                        delay: i * 0.1,
                        ease: "easeInOut"
                      }}
                      viewport={{ once: true }}
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20" />
                        <div className="flex-1">
                          <div className="h-3 bg-gray-600 rounded w-20 mb-2" />
                          <div className="h-2 bg-gray-700 rounded w-32" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Final Clean UI Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 1.8 }}
                viewport={{ once: true }}
                className="relative z-10"
              >
                <Card className="bg-card/90 backdrop-blur-sm border-border p-6 max-w-md shadow-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant="destructive" className="text-xs">High Priority</Badge>
                    <Badge variant="outline" className="text-xs">In Progress</Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Wi-Fi Down in Lab 3</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unable to connect to network. Affecting 15+ students.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    <span>3 updates</span>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Text Content */}
            <div className="text-center">
              <h2 className="text-5xl md:text-7xl font-bold mb-8">
                Move past the noise.
              </h2>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto">
                From scattered messages to a streamlined solution. We built a professional 
                tool for a professional community.
              </p>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Section 3: Horizontal Feature Tour */}
      <section ref={horizontalRef} className="relative" style={{ height: "300vh" }}>
        <div className="sticky top-0 h-screen flex items-center overflow-hidden">
          <motion.div 
            className="flex gap-12 px-12"
            style={{ x: horizontalX }}
          >
            {/* Slide 1: Submit */}
            <div className="min-w-[100vw] h-screen flex items-center justify-center">
              <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center px-6">
                <div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6">Submit.</h2>
                  <p className="text-xl text-gray-400 leading-relaxed">
                    Submit with detail. Attach images, set urgency, and send.
                  </p>
                </div>
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                  >
                    <Card className="bg-card border-border p-6">
                      <div className="space-y-4">
                        <div>
                          <div className="h-3 bg-muted rounded w-24 mb-3" />
                          <div className="h-10 bg-muted rounded" />
                        </div>
                        <div>
                          <div className="h-3 bg-muted rounded w-32 mb-3" />
                          <div className="h-24 bg-muted rounded" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-20 w-20 bg-muted rounded" />
                          <div className="h-20 w-20 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/20" />
                        </div>
                        <div className="h-10 bg-primary/20 rounded flex items-center justify-center">
                          <div className="h-3 bg-primary rounded w-16" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Slide 2: Track */}
            <div className="min-w-[100vw] h-screen flex items-center justify-center">
              <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center px-6">
                <div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6">Track.</h2>
                  <p className="text-xl text-gray-400 leading-relaxed">
                    Track in real-time. No more guessing. See exactly when your issue is being handled.
                  </p>
                </div>
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                  >
                    <Card className="bg-card border-border p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-muted rounded w-32" />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          viewport={{ once: true }}
                        >
                          <Badge variant="outline" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            In Progress
                          </Badge>
                        </motion.div>
                      </div>
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="border-t border-border pt-4 mt-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20" />
                          <div className="flex-1">
                            <div className="h-3 bg-muted rounded w-24 mb-2" />
                            <div className="h-2 bg-muted rounded w-full" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Slide 3: Resolve */}
            <div className="min-w-[100vw] h-screen flex items-center justify-center">
              <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center px-6">
                <div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6">Resolve.</h2>
                  <p className="text-xl text-gray-400 leading-relaxed">
                    Rate the resolution. Provide feedback to ensure quality and accountability.
                  </p>
                </div>
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                  >
                    <Card className="bg-card border-border p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-muted rounded w-32" />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          viewport={{ once: true }}
                        >
                          <Badge className="gap-1 bg-success text-success-foreground">
                            <CheckCircle2 className="w-3 h-3" />
                            Resolved
                          </Badge>
                        </motion.div>
                      </div>
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="border-t border-border pt-4 mt-4">
                        <div className="text-sm text-muted-foreground mb-3">Rate this resolution:</div>
                        <motion.div
                          className="flex gap-2"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.8 }}
                          viewport={{ once: true }}
                        >
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                          ))}
                        </motion.div>
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Core Principles */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <FadeInSection>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold mb-16 text-center">
              Core Principles
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Transparency */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Transparency</h3>
                <p className="text-gray-400 leading-relaxed">
                  See every update in real-time. Know you've been heard. No more shouting into the void.
                </p>
              </div>

              {/* Efficiency */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Efficiency</h3>
                <p className="text-gray-400 leading-relaxed">
                  From report to resolution. A streamlined process for a high-performance community.
                </p>
              </div>

              {/* Accountability */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Accountability</h3>
                <p className="text-gray-400 leading-relaxed">
                  Clear ownership and status tracking. We build on a foundation of trust.
                </p>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Section 5: Final CTA */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <FadeInSection delay={0.2}>
          <div className="text-center">
            <h2 className="text-5xl md:text-7xl font-bold mb-8">
              Join Connect.
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
