import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { SmartContract } from "@/types/blockchain";

interface SmartContractStatusProps {
  expanded?: boolean;
}

export function SmartContractStatus({ expanded = false }: SmartContractStatusProps) {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['/api/contracts'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="status-active">Active</Badge>;
      case 'deploying':
        return <Badge className="status-deploying">Deploying</Badge>;
      case 'error':
        return <Badge className="status-error">Error</Badge>;
      default:
        return <Badge className="status-pending">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-chitty-card border-chitty-border">
        <CardHeader className="border-b border-chitty-border">
          <CardTitle className="text-lg font-semibold">Smart Contracts</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 bg-chitty-black rounded-lg">
                  <div>
                    <div className="h-4 bg-gray-600 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-600 rounded w-48"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-6 bg-gray-600 rounded w-16"></div>
                    <div className="h-4 w-4 bg-gray-600 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-chitty-card border-chitty-border">
      <CardHeader className="border-b border-chitty-border">
        <CardTitle className="text-lg font-semibold">Smart Contracts</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {contracts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No smart contracts deployed</p>
          </div>
        ) : (
          contracts.map((contract: SmartContract) => (
            <div key={contract.address} className="flex items-center justify-between p-4 bg-chitty-black rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{contract.name}</p>
                <p className="text-sm text-gray-400 mono">
                  {contract.address.substring(0, 20)}...
                </p>
                {expanded && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">
                      Deployed by: {contract.deployedBy}
                    </p>
                    <p className="text-xs text-gray-500">
                      Gas used: {contract.gasUsed?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Block: #{contract.blockNumber || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Deployed: {new Date(contract.deployedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(contract.status)}
                <button className="text-chitty-blue hover:text-blue-400">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
