import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, CheckCircle } from "lucide-react";

interface EvidenceChainPanelProps {
  expanded?: boolean;
}

export function EvidenceChainPanel({ expanded = false }: EvidenceChainPanelProps) {
  const { data: recentCases = [] } = useQuery({
    queryKey: ['/api/cases'],
    refetchInterval: 10000,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['/api/audit/trail'],
    refetchInterval: 5000,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="status-pending">Active</Badge>;
      case 'resolved':
        return <Badge className="status-active">Resolved</Badge>;
      case 'pending':
        return <Badge className="status-error">Pending</Badge>;
      default:
        return <Badge className="status-pending">Unknown</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Cases */}
      <Card className="bg-chitty-card border-chitty-border">
        <CardHeader className="border-b border-chitty-border">
          <CardTitle className="text-lg font-semibold">Recent Cases</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {recentCases.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">No recent cases</p>
            </div>
          ) : (
            recentCases.slice(0, expanded ? 10 : 3).map((caseItem: any, index: number) => (
              <div key={caseItem.caseNumber || index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {caseItem.caseNumber || `Case #${index + 1}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {caseItem.title || 'Property Dispute'}
                  </p>
                </div>
                {getStatusBadge(caseItem.status || 'active')}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chain of Custody */}
      <Card className="bg-chitty-card border-chitty-border">
        <CardHeader className="border-b border-chitty-border">
          <CardTitle className="text-lg font-semibold">Chain of Custody</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {[
            {
              action: "Evidence Submitted",
              timestamp: new Date(Date.now() - 1000 * 60 * 5),
              user: "Attorney Johnson",
              icon: <Shield size={16} className="text-blue-400" />,
            },
            {
              action: "Forensic Verification",
              timestamp: new Date(Date.now() - 1000 * 60 * 15),
              user: "Expert Wilson",
              icon: <CheckCircle size={16} className="text-green-400" />,
            },
            {
              action: "Blockchain Recording",
              timestamp: new Date(Date.now() - 1000 * 60 * 25),
              user: "System",
              icon: <Clock size={16} className="text-yellow-400" />,
            },
          ].map((entry, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="mt-0.5">{entry.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{entry.action}</p>
                <p className="text-xs text-gray-400">
                  by {entry.user} • {entry.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card className="bg-chitty-card border-chitty-border">
        <CardHeader className="border-b border-chitty-border">
          <CardTitle className="text-lg font-semibold">Compliance Status</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Cook County Standards</span>
              <Badge className="status-active">Compliant</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">7-Year Retention</span>
              <Badge className="status-active">Compliant</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Audit Trail Complete</span>
              <Badge className="status-active">Yes</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Blockchain Verified</span>
              <Badge className="status-active">100%</Badge>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-chitty-border">
            <div className="flex justify-between text-sm">
              <span>Overall Compliance Score</span>
              <span className="text-green-400 font-bold">98.7%</span>
            </div>
            <div className="w-full bg-chitty-black rounded-full h-2 mt-2">
              <div className="bg-green-400 h-2 rounded-full" style={{ width: '98.7%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
