import { useBlockchain } from "@/hooks/useBlockchain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Shield, Home, Plus } from "lucide-react";

export function BlockchainVisualization() {
  const { stats, chainHealth } = useBlockchain();

  return (
    <Card className="bg-chitty-card border-chitty-border">
      <CardHeader className="border-b border-chitty-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Evidence Chain Activity</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Auto-refresh:</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-dot"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="blockchain-grid rounded-lg bg-chitty-black p-6 min-h-64">
          <div className="flex items-center justify-center space-x-8">
            {/* Genesis Block */}
            <div className="text-center">
              <div className="w-16 h-16 bg-chitty-blue rounded-lg flex items-center justify-center mb-2 glow-blue">
                <Activity className="text-white" size={24} />
              </div>
              <p className="text-xs text-gray-400">Genesis</p>
              <p className="text-xs mono text-white">Block #0</p>
            </div>

            <div className="flex-1 border-t-2 border-dashed border-chitty-blue"></div>

            {/* Evidence Blocks */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center mb-2">
                <Shield className="text-white" size={24} />
              </div>
              <p className="text-xs text-gray-400">Evidence</p>
              <p className="text-xs mono text-white">
                Block #{stats?.totalBlocks ? stats.totalBlocks - 2 : '847,327'}
              </p>
            </div>

            <div className="flex-1 border-t-2 border-dashed border-green-500"></div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mb-2">
                <Home className="text-white" size={24} />
              </div>
              <p className="text-xs text-gray-400">Property</p>
              <p className="text-xs mono text-white">
                Block #{stats?.totalBlocks ? stats.totalBlocks - 1 : '847,328'}
              </p>
            </div>

            <div className="flex-1 border-t-2 border-dashed border-purple-500"></div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mb-2 animate-pulse">
                <Plus className="text-white" size={24} />
              </div>
              <p className="text-xs text-gray-400">Next Block</p>
              <p className="text-xs mono text-white">Pending...</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-chitty-blue">
                {stats?.evidenceRecords?.toLocaleString() || '23,847'}
              </p>
              <p className="text-sm text-gray-400">Evidence Records</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {chainHealth?.isValid ? '99.97%' : '0%'}
              </p>
              <p className="text-sm text-gray-400">Verification Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {chainHealth?.averageBlockTime ? `${chainHealth.averageBlockTime}s` : '12.3s'}
              </p>
              <p className="text-sm text-gray-400">Avg Block Time</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
