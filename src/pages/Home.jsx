import React from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Footer from '../components/Footer'
import FAQ from '../components/FAQ'
import CustomCursor from '../components/CustomCursor'
import ScrollProgressBar from '../components/ScrollProgressBar'
import { useSiteTheme } from '../hooks/useSiteTheme'
import '../App.css'

export default function Home() {
  const { theme, toggleTheme } = useSiteTheme()

  return (
    <div
      data-theme={theme}
      style={{ colorScheme: theme }}
      className="bg-background font-body text-on-surface antialiased selection:bg-primary selection:text-on-primary transition-colors duration-300"
    >
      <CustomCursor />
      <ScrollProgressBar />
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero />
      </main>
      <FAQ />
      <Footer />
    </div>
  )
}
