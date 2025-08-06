import { 
  BarChart3, 
  Shield, 
  FileText, 
  Scale, 
  Home, 
  Activity,
  Gauge,
  Brain,
  Network,
  Hash,
  Radio
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isConnected: boolean;
}

export function Sidebar({ activeSection, onSectionChange, isConnected }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'blockchain', label: 'Blockchain Core', icon: Activity },
    { id: 'contracts', label: 'Smart Contracts', icon: FileText },
    { id: 'evidence', label: 'Evidence Chains', icon: Shield },
    { id: 'ai-analysis', label: 'AI Analysis', icon: Brain },
    { id: 'cases', label: 'Case Management', icon: Scale },
    { id: 'property', label: 'Property NFTs', icon: Home },
    { id: 'chittyid', label: 'ChittyID System', icon: Hash },
    { id: 'beacon', label: 'App Tracking', icon: Radio },
    { id: 'ecosystem', label: 'Ecosystem', icon: Network },
    { id: 'monitoring', label: 'Monitoring', icon: Gauge },
  ];

  const systemStatus = [
    { name: 'ChittyChain Core', status: 'active' },
    { name: 'IPFS Network', status: 'active' },
    { name: 'WebSocket', status: isConnected ? 'active' : 'error' },
    { name: 'AI Analysis', status: 'active' },
    { name: 'Audit Engine', status: 'pending' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <aside className="w-64 bg-chitty-dark border-r border-chitty-border flex flex-col">
      <nav className="p-4 flex-1">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-chitty-blue text-white'
                    : 'text-gray-300 hover:bg-chitty-card'
                }`}
              >
                <IconComponent size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-chitty-border">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            System Status
          </h3>
          <div className="space-y-2 text-sm">
            {systemStatus.map((system, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-300">{system.name}</span>
                <div className={`w-2 h-2 rounded-full ${
                  system.status === 'active' ? 'bg-green-500' :
                  system.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
