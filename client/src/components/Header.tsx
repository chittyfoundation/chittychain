import { Button } from "@/components/ui/button";
import { useBlockchain } from "@/hooks/useBlockchain";

export function Header() {
  const { stats, chainHealth } = useBlockchain();

  return (
    <header className="bg-chitty-dark border-b border-chitty-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">ChittyChain</h1>
          <span className="text-sm text-gray-400 mono">MCP Cloud Server</span>
          <div className="flex items-center space-x-2 ml-4">
            <div className={`w-2 h-2 rounded-full animate-pulse-dot ${
              chainHealth?.isValid ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`text-xs ${
              chainHealth?.isValid ? 'text-green-400' : 'text-red-400'
            }`}>
              {chainHealth?.isValid ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-gray-400">Block Height</div>
            <div className="font-mono text-chitty-blue">
              {stats?.totalBlocks?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Gas Price</div>
            <div className="font-mono text-white">23 gwei</div>
          </div>
          <Button className="bg-chitty-blue hover:bg-blue-600 text-white">
            Deploy Contract
          </Button>
        </div>
      </div>
    </header>
  );
}
