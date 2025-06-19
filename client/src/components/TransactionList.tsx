import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Home, Gavel, Shield } from "lucide-react";
import { Transaction } from "@/types/blockchain";

interface TransactionListProps {
  limit?: number;
}

export function TransactionList({ limit = 10 }: TransactionListProps) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: [`/api/blockchain/transactions/recent?limit=${limit}`],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'evidence':
        return <FileText className="text-xs" />;
      case 'property':
        return <Home className="text-xs" />;
      case 'case':
        return <Gavel className="text-xs" />;
      case 'audit':
        return <Shield className="text-xs" />;
      default:
        return <FileText className="text-xs" />;
    }
  };

  const getTransactionClass = (type: string) => {
    switch (type) {
      case 'evidence':
        return 'tx-evidence';
      case 'property':
        return 'tx-property';
      case 'case':
        return 'tx-case';
      case 'audit':
        return 'tx-audit';
      default:
        return 'tx-evidence';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="status-active">Confirmed</Badge>;
      case 'pending':
        return <Badge className="status-pending">Pending</Badge>;
      default:
        return <Badge className="status-pending">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-chitty-card border-chitty-border">
        <CardHeader className="border-b border-chitty-border">
          <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 bg-chitty-black rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-gray-600 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-600 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-600 rounded w-16 mb-1"></div>
                    <div className="h-3 bg-gray-600 rounded w-12"></div>
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
          <button className="text-chitty-blue hover:text-blue-400 text-sm">View All</button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No recent transactions</p>
            </div>
          ) : (
            transactions.map((tx: Transaction, index: number) => (
              <div key={tx.hash || index} className="flex items-center justify-between p-4 bg-chitty-black rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTransactionClass(tx.type)}`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-medium capitalize">
                      {tx.type === 'evidence' && 'Evidence Recorded'}
                      {tx.type === 'property' && 'Property NFT Minted'}
                      {tx.type === 'case' && 'Case Created'}
                      {tx.type === 'audit' && 'Audit Entry'}
                    </p>
                    <p className="text-sm text-gray-400 mono">
                      {tx.hash ? `${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 4)}` : 'No hash'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(tx.status || 'confirmed')}
                  <p className="text-xs text-gray-400 mt-1">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : 'Just now'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
