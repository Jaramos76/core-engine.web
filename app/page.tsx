import Header from "./components/Header";
import Hero from "./components/Hero";
import WhatIsCoreEngine from "./components/WhatIsCoreEngine";
import ArchitectureDiagram from "./components/ArchitectureDiagram";
import Principles from "./components/Principles";
import DevelopmentStatus from "./components/DevelopmentStatus";
import Developers from "./components/Developers";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhatIsCoreEngine />
        <ArchitectureDiagram />
        <Principles />
        <DevelopmentStatus />
        <Developers />
      </main>
      <Footer />
    </>
  );
}
