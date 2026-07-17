import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import PersonasSection from "@/components/PersonasSection";
import AISection from "@/components/AISection";
import SecuritySection from "@/components/SecuritySection";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PersonasSection />
        <AISection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
