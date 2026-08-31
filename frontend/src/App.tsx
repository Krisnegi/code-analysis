import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { ReportPage } from './pages/Report'
import { BenchmarkPage } from './pages/Benchmark'

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/report/:id" element={<ReportPage />} />
            <Route path="/benchmark" element={<BenchmarkPage />} />
          </Routes>
        </main>

        <footer className="border-t border-[#1f293d] py-6 text-center text-xs text-slate-500 bg-[#0a0d14]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>Built for micro1 Agentic Workflows Hackathon</span>
            <div className="flex items-center space-x-4">
              <span>Gemini 2.0 Flash Primary</span>
              <span>•</span>
              <span>Groq Llama 3.3 Fallback</span>
              <span>•</span>
              <span>Two-Container Docker Sandbox</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  )
}
