import { useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SystemStats } from "@/components/SystemStats";
import { TransactionList } from "@/components/TransactionList";
import { SmartContractStatus } from "@/components/SmartContractStatus";
import { BlockchainVisualization } from "@/components/BlockchainVisualization";
import { EvidenceChainPanel } from "@/components/EvidenceChainPanel";
import { AIAnalysisDashboard } from "@/components/ai/AIAnalysisDashboard";
import { EcosystemOverview } from "@/components/ecosystem/EcosystemOverview";
import { ChittyIDDashboard } from "@/components/chittyid/ChittyIDDashboard";
import { BeaconDashboard } from "@/components/beacon/BeaconDashboard";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useBlockchain } from "@/hooks/useBlockchain";

type SectionType = 'dashboard' | 'blockchain' | 'contracts' | 'evidence' | 'cases' | 'property' | 'monitoring' | 'ai-analysis' | 'ecosystem' | 'chittyid' | 'beacon';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<SectionType>('dashboard');
  const { isConnected, lastMessage } = useWebSocket();
  const { stats, recentTransactions, contracts } = useBlockchain();

  const renderMainContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <SystemStats />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TransactionList />
              <SmartContractStatus />
            </div>
            
            <BlockchainVisualization />
            <EvidenceChainPanel />
          </div>
        );
      
      case 'blockchain':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <BlockchainVisualization />
              </div>
              <div>
                <SystemStats />
              </div>
            </div>
            <TransactionList limit={20} />
          </div>
        );
      
      case 'contracts':
        return (
          <div className="space-y-6">
            <SmartContractStatus expanded={true} />
          </div>
        );
      
      case 'evidence':
        return (
          <div className="space-y-6">
            <EvidenceChainPanel expanded={true} />
          </div>
        );
      
      case 'cases':
        return (
          <div className="bg-chitty-card rounded-xl border border-chitty-border p-6">
            <h2 className="text-xl font-semibold mb-4">Case Management</h2>
            <p className="text-gray-400">Case management interface coming soon...</p>
          </div>
        );
      
      case 'property':
        return (
          <div className="bg-chitty-card rounded-xl border border-chitty-border p-6">
            <h2 className="text-xl font-semibold mb-4">Property NFTs</h2>
            <p className="text-gray-400">Property NFT management interface coming soon...</p>
          </div>
        );

      case 'ai-analysis':
        return <AIAnalysisDashboard />;

      case 'ecosystem':
        return <EcosystemOverview />;

      case 'chittyid':
        return <ChittyIDDashboard />;

      case 'beacon':
        return <BeaconDashboard />;
      
      case 'monitoring':
        return (
          <div className="space-y-6">
            <SystemStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-chitty-card rounded-xl border border-chitty-border p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU Usage</span>
                      <span className="text-chitty-blue">34%</span>
                    </div>
                    <div className="w-full bg-chitty-black rounded-full h-2">
                      <div className="bg-chitty-blue h-2 rounded-full" style={{ width: '34%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span className="text-green-400">67%</span>
                    </div>
                    <div className="w-full bg-chitty-black rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{ width: '67%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage Usage</span>
                      <span className="text-yellow-400">23%</span>
                    </div>
                    <div className="w-full bg-chitty-black rounded-full h-2">
                      <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '23%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Network I/O</span>
                      <span className="text-purple-400">89%</span>
                    </div>
                    <div className="w-full bg-chitty-black rounded-full h-2">
                      <div className="bg-purple-400 h-2 rounded-full" style={{ width: '89%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-chitty-card rounded-xl border border-chitty-border p-6">
                <h3 className="text-lg font-semibold mb-4">API Status</h3>
                <div className="space-y-3">
                  {[
                    { endpoint: '/api/blockchain/status', latency: '200ms', status: 'active' },
                    { endpoint: '/api/evidence/submit', latency: '150ms', status: 'active' },
                    { endpoint: '/api/property/mint', latency: '320ms', status: 'pending' },
                    { endpoint: '/api/case/create', latency: '180ms', status: 'active' },
                    { endpoint: '/api/audit/trail', latency: '95ms', status: 'active' },
                  ].map((api, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{api.endpoint}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400 mono">{api.latency}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          api.status === 'active' ? 'bg-green-500' : 
                          api.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="h-screen bg-chitty-black text-white flex flex-col">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={(section: string) => setActiveSection(section as SectionType)}
          isConnected={isConnected}
        />
        
        <main className="flex-1 overflow-auto custom-scrollbar">
          <div className="p-6">
            {renderMainContent()}
          </div>
        </main>
      </div>
      
      {/* WebSocket Connection Status */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-chitty-card border border-chitty-border rounded-lg p-3 flex items-center space-x-2 shadow-lg">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse-dot' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-300">
            {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
          </span>
          {lastMessage && (
            <span className="text-xs text-gray-400 mono">
              {new Date(lastMessage.timestamp || Date.now()).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
