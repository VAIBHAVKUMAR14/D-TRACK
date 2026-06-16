import { HashRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Menu } from "lucide-react";
import { useState } from "react";
import Dashboard from "@/pages/dashboard";
import Graph from "@/pages/graph";
import Leaderboard from "@/pages/leaderboard";
import NLPInspector from "@/pages/nlp";
import IdentityDive from "@/pages/identity";
import BurnerLeads from "@/pages/burner";
import AddProfile from "@/pages/add-profile";
import Pipeline from "@/pages/pipeline";
import Investigate from "@/pages/investigate";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Layout({ children, title, description }: { children: React.ReactNode; title?: string; description?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen" style={{ background: 'hsl(222 47% 5%)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-10
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'hsl(215 20% 55%)' }}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        {/* Page content */}
        <div className="flex-1 p-3 lg:p-5">
          <div className="glass-card min-h-full">
            {title && (
              <div className="pt-6 px-5 lg:px-6 pb-4">
                <h1 className="text-xl font-bold" style={{ color: 'hsl(210 40% 93%)' }}>{title}</h1>
                {description && (
                  <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 50%)' }}>{description}</p>
                )}
                <div className="mt-4" style={{ height: '1px', background: 'linear-gradient(to right, hsla(245, 58%, 64%, 0.2), transparent)' }} />
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/investigate" element={<Layout title="Live Investigation" description="Real-time intelligence pipeline — paste any text and watch it process"><Investigate /></Layout>} />
      <Route path="/graph" element={<Layout title="Shadow Graph" description="Interactive network of linked accounts and crypto wallets"><Graph /></Layout>} />
      <Route path="/leaderboard" element={<Layout title="Risk Leaderboard" description="Unified identities ranked by composite risk score"><Leaderboard /></Layout>} />
      <Route path="/nlp" element={<Layout title="NLP Inspector" description="Real-time Slang-to-Signal semantic analysis"><NLPInspector /></Layout>} />
      <Route path="/identity" element={<Layout title="Identity Reveal" description="Cross-platform identity de-anonymization — see how fragmented personas merge into one operator"><IdentityDive /></Layout>} />
      <Route path="/burner" element={<Layout title="Burner Leads" description="Probable burner accounts detected via stylometric fingerprinting"><BurnerLeads /></Layout>} />
      <Route path="/pipeline" element={<Layout title="Tech Pipeline" description="Complete technical breakdown of the D-TRACK analysis engine"><Pipeline /></Layout>} />
      <Route path="/add" element={<Layout title="Add Profile" description="Inject custom profiles into the analysis pipeline"><AddProfile /></Layout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </HashRouter>
  );
}

export default App;
