import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, AlertCircle, CheckCircle2, Code, Users, UserCheck, Heart, Image } from "lucide-react";
import logo from "@/assets/brototype-logo.png";
import { CustomCursor } from "@/components/CustomCursor";
import { BackToTopButton } from "@/components/BackToTopButton";
import { StickyNav } from "@/components/StickyNav";

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
  const [contentIndex, setContentIndex] = useState(0);

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const { scrollYProgress: horizontalScrollProgress } = useScroll({
    target: horizontalRef,
    offset: ["start start", "end end"]
  });

  // Global scroll progress for progress bar
  const { scrollYProgress } = useScroll();

  const heroRotateX = useTransform(heroScrollProgress, [0, 1], [0, 15]);
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 0.9]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.5, 1], [1, 0.8, 0.3]);
  
  // Hero parallax effect - background moves slower than content
  const heroBackgroundY = useTransform(heroScrollProgress, [0, 1], [0, -200]);

  const horizontalX = useTransform(horizontalScrollProgress, [0, 1], ["0%", "-300%"]);

  // Content arrays for Living Hub
  const communityPosts = [
    { author: "Alex Kumar", handle: "@alex_codes", text: "Just launched my first React project! Thanks to @mentor for the help! #brototype #react", likes: 42, comments: 12 },
    { author: "Priya Singh", handle: "@priya_dev", text: "Anyone else struggling with async/await? Let's pair program! 💻", likes: 28, comments: 8 },
    { author: "John Mathew", handle: "@john_codes", text: "Finished the JavaScript course today! Feeling pumped! 🔥 #brototype", likes: 56, comments: 19 }
  ];

  const complaints = [
    { title: "WiFi in Lab 3 is down", resolution: "IT team replaced the faulty router. WiFi is now operational.", time: "2 hours ago" },
    { title: "Broken chair in Study Room 2", resolution: "Maintenance team replaced the chair. Room is now ready for use.", time: "1 day ago" },
    { title: "AC not working in Classroom A", resolution: "HVAC technician repaired the AC unit. Temperature is now optimal.", time: "3 hours ago" }
  ];

  const imageCaptions = [
    "The Brocamp in action.",
    "Hackathon winners 2024.",
    "Community meetup last Friday."
  ];

  const discussionPosts = [
    { author: "Maria Santos", handle: "@maria_ui", text: "What's everyone's favorite VS Code theme for dark mode? Need ideas.", likes: 18, comments: 15 },
    { author: "Rahul Verma", handle: "@rahul_js", text: "Just discovered the power of TypeScript! Game changer 🚀", likes: 34, comments: 21 },
    { author: "Sarah Johnson", handle: "@sarah_fullstack", text: "Looking for a study buddy for the Node.js module. DM me!", likes: 22, comments: 9 }
  ];

  // Auto-rotate content every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setContentIndex((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    navigate(user ? '/dashboard' : '/auth');
  };

  return (
    <div className="bg-black text-white" style={{ perspective: "1200px" }}>
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />
      
      {/* Sticky Navigation */}
      <StickyNav onGetStarted={handleGetStarted} />

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
        {/* Subtle background animation with parallax */}
        <motion.div 
          className="absolute inset-0 overflow-hidden opacity-20"
          style={{ y: heroBackgroundY }}
        >
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-center z-10"
        >
          <img src={logo} alt="Brototype Logo" className="w-24 h-24 mx-auto mb-8 opacity-90" />
          <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight gradient-text-hover">
            Brototype Connect
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-4 max-w-2xl mx-auto">
            A direct line. A clear voice.
          </p>
          <p className="text-lg md:text-xl text-gray-400/80 mb-12 max-w-2xl mx-auto">
            The official hub for the Brototype Community.
          </p>
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="rounded-full px-8 py-6 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
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
              <h2 className="text-5xl md:text-7xl font-bold mb-8 gradient-text-hover">
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
      <section ref={horizontalRef} className="relative" style={{ height: "400vh" }}>
        <div className="sticky top-0 h-screen flex items-center overflow-hidden">
          <motion.div 
            className="flex gap-12 px-12"
            style={{ x: horizontalX }}
          >
            {/* Slide 1: Submit */}
            <div className="min-w-[100vw] h-screen flex items-center justify-center">
              <motion.div 
                className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center px-6 md:px-8"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                viewport={{ once: false, amount: 0.4 }}
              >
                <div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text-hover">Submit.</h2>
                  <p className="text-xl text-gray-400 leading-relaxed">
                    Submit with detail. Attach images, set urgency, and send.
                  </p>
                </div>
                <div className="relative">
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
                </div>
              </motion.div>
            </div>

            {/* Slide 2: Track */}
            <div className="min-w-[100vw] h-screen flex items-center justify-center">
              <motion.div 
                className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center px-6 md:px-8"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                viewport={{ once: false, amount: 0.4 }}
              >
                <div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text-hover">Track.</h2>
                  <p className="text-xl text-gray-400 leading-relaxed">
                    Track in real-time. No more guessing. See exactly when your issue is being handled.
                  </p>
                </div>
                <div className="relative">
                  <Card className="bg-card border-border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-muted rounded w-32" />
                      <Badge variant="outline" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        In Progress
                      </Badge>
                    </div>
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="space-y-3 pt-4 border-t border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-success/20" />
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded w-24 mb-2" />
                          <div className="h-2 bg-muted/60 rounded w-32" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-warning/20" />
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded w-32 mb-2" />
                          <div className="h-2 bg-muted/60 rounded w-28" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 opacity-40">
                        <div className="w-8 h-8 rounded-full bg-muted/20" />
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded w-20 mb-2" />
                          <div className="h-2 bg-muted/60 rounded w-24" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            </div>


            {/* Slide 3: Resolve */}
            <div className="min-w-[100vw] h-screen flex items-center justify-center">
              <motion.div 
                className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center px-6 md:px-8"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                viewport={{ once: false, amount: 0.4 }}
              >
                <div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text-hover">Resolve.</h2>
                  <p className="text-xl text-gray-400 leading-relaxed">
                    Rate the resolution. Provide feedback to ensure quality and accountability.
                  </p>
                </div>
                <div className="relative">
                  <Card className="bg-card border-border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-muted rounded w-32" />
                      <Badge className="gap-1 bg-success text-success-foreground">
                        <CheckCircle2 className="w-3 h-3" />
                        Resolved
                      </Badge>
                    </div>
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="border-t border-border pt-4 mt-4">
                      <div className="text-sm text-muted-foreground mb-3">Rate this resolution:</div>
                      <div className="flex gap-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            </div>

            {/* Slide 4: Connect */}
            <div className="min-w-[100vw] h-screen flex items-center justify-center">
              <motion.div 
                className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center px-6 md:px-8"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                viewport={{ once: false, amount: 0.4 }}
              >
                <div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text-hover">Connect.</h2>
                  <p className="text-xl text-gray-400 leading-relaxed">
                    Join the conversation. Share ideas, ask questions, and connect with the entire Brocamp community.
                  </p>
                </div>
                <div className="relative">
                  <Card className="bg-card border-border p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">Sarah Johnson</span>
                          <span className="text-xs text-gray-500">@sarah_dev</span>
                        </div>
                        <p className="text-sm mb-3">
                          Hackathon this weekend! Who's in? 🚀
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                            <Heart className="h-4 w-4" />
                            <span>24</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-primary transition-colors">
                            <MessageSquare className="h-4 w-4" />
                            <span>8</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Built for the Brocamp */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20 md:-mt-[100vh]">
        <FadeInSection>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold mb-16 text-center gradient-text-hover">
              More than an app. A Philosophy.
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Practical First */}
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Code className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Practical First</h3>
                <p className="text-gray-400 leading-relaxed">
                  Brototype is about building real-world solutions. 'Connect' is our own professional tool, built by and for the community to solve our own daily challenges.
                </p>
              </div>

              {/* Community-Driven */}
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Community-Driven</h3>
                <p className="text-gray-400 leading-relaxed">
                  From peer-to-peer learning to collaborative projects, community is everything. This is your central hub to engage, share, and grow together.
                </p>
              </div>

              {/* Total Ownership */}
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UserCheck className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Total Ownership</h3>
                <p className="text-gray-400 leading-relaxed">
                  This platform empowers you to take ownership of your environment. Report issues, track solutions, and help us build a better campus.
                </p>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Section 5: A Living Hub */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <FadeInSection>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-bold mb-16 text-center gradient-text-hover">
              A Living Hub.
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Grid Item 1: Community Post */}
              <Card className="bg-card border-border p-6 min-h-[180px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`post1-${contentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{communityPosts[contentIndex].author}</span>
                          <span className="text-xs text-gray-500">{communityPosts[contentIndex].handle}</span>
                        </div>
                        <p className="text-sm mb-3">
                          {communityPosts[contentIndex].text}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                            <Heart className="h-4 w-4" />
                            <span>{communityPosts[contentIndex].likes}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-primary transition-colors">
                            <MessageSquare className="h-4 w-4" />
                            <span>{communityPosts[contentIndex].comments}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Card>

              {/* Grid Item 2: Resolved Complaint */}
              <Card className="bg-card border-border p-6 min-h-[180px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`complaint-${contentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{complaints[contentIndex].title}</span>
                          <Badge className="bg-success text-success-foreground">Resolved</Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                          {complaints[contentIndex].resolution}
                        </p>
                        <div className="text-xs text-gray-500">
                          Resolved {complaints[contentIndex].time}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Card>

              {/* Grid Item 3: Community Image */}
              <Card className="bg-card border-border p-6 min-h-[180px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`image-${contentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-3">
                      <Image className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-gray-400 text-center">
                      {imageCaptions[contentIndex]}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </Card>

              {/* Grid Item 4: Community Post */}
              <Card className="bg-card border-border p-6 min-h-[180px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`post2-${contentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{discussionPosts[contentIndex].author}</span>
                          <span className="text-xs text-gray-500">{discussionPosts[contentIndex].handle}</span>
                        </div>
                        <p className="text-sm mb-3">
                          {discussionPosts[contentIndex].text}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                            <Heart className="h-4 w-4" />
                            <span>{discussionPosts[contentIndex].likes}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-primary transition-colors">
                            <MessageSquare className="h-4 w-4" />
                            <span>{discussionPosts[contentIndex].comments}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Card>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Section 6: Final CTA */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <FadeInSection delay={0.2}>
          <div className="text-center">
            <h2 className="text-5xl md:text-7xl font-bold mb-8 gradient-text-hover">
              Join Connect.
            </h2>
            <p className="text-lg md:text-xl text-gray-400 mb-12">
              Log in to view your dashboard or register a new complaint.
            </p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="rounded-full px-8 py-6 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Button>
          </div>
        </FadeInSection>
      </section>

      {/* Fade to black at bottom */}
      <div className="h-32 bg-gradient-to-b from-transparent to-black" />
      
      {/* Custom Cursor */}
      <CustomCursor />
      
      {/* Back to Top Button */}
      <BackToTopButton />
    </div>
  );
};

export default Landing;
