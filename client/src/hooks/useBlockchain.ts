import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useEffect, useState } from 'react';

export function useBlockchain() {
  const { lastMessage } = useWebSocket();
  const [realTimeStats, setRealTimeStats] = useState<any>(null);

  // Fetch blockchain status
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/blockchain/status'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch recent transactions
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['/api/blockchain/transactions/recent?limit=10'],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch smart contracts
  const { data: contracts = [] } = useQuery({
    queryKey: ['/api/contracts'],
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Listen for WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'new_block':
          refetchStatus();
          break;
        case 'new_transaction':
          // Transaction list will auto-refresh
          break;
        case 'system_stats':
          setRealTimeStats(lastMessage.data);
          break;
        default:
          break;
      }
    }
  }, [lastMessage, refetchStatus]);

  const stats = realTimeStats?.stats || statusData?.stats;
  const chainHealth = realTimeStats?.health || statusData?.health;

  return {
    stats,
    chainHealth,
    recentTransactions,
    contracts,
    isLoading: !statusData,
    refetchStatus,
  };
}
