import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { CreateCaseModal } from './CreateCaseModal';
import { CaseDetailsModal } from './CaseDetailsModal';

interface LegalCase {
  id: string;
  caseNumber: string;
  caseType: string;
  jurisdiction: string;
  status: 'PENDING' | 'ACTIVE' | 'DISCOVERY' | 'TRIAL' | 'CLOSED' | 'SETTLED';
  filingDate: string;
  petitioner: string;
  respondent: string;
  judge: string;
  artifactCount: number;
  lastActivity: string;
  nextHearing?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
}

export function CaseManagement() {
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<LegalCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const statusColors = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ACTIVE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    DISCOVERY: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    TRIAL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    CLOSED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    SETTLED: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const priorityColors = {
    low: 'bg-gray-500/20 text-gray-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400',
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    filterCases();
  }, [searchTerm, statusFilter, typeFilter, cases]);

  const fetchCases = async () => {
    try {
      const response = await fetch('/api/v1/cases', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chittychain_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }

      const data = await response.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast({
        title: "Error",
        description: "Failed to load cases",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterCases = () => {
    let filtered = cases;

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.petitioner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.respondent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.judge.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.caseType === typeFilter);
    }

    setFilteredCases(filtered);
  };

  const handleCaseCreated = (newCase: LegalCase) => {
    setCases(prev => [newCase, ...prev]);
    setShowCreateModal(false);
    toast({
      title: "Case Created",
      description: `Case ${newCase.caseNumber} has been created successfully`,
    });
  };

  const handleViewCase = (caseItem: LegalCase) => {
    setSelectedCase(caseItem);
    setShowDetailsModal(true);
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      const response = await fetch(`/api/v1/cases/${caseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chittychain_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete case');
      }

      setCases(prev => prev.filter(c => c.id !== caseId));
      toast({
        title: "Case Deleted",
        description: "Case has been permanently deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete case",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-3 h-3" />;
      case 'ACTIVE': return <CheckCircle className="w-3 h-3" />;
      case 'DISCOVERY': return <Search className="w-3 h-3" />;
      case 'TRIAL': return <Scale className="w-3 h-3" />;
      case 'CLOSED': return <CheckCircle className="w-3 h-3" />;
      case 'SETTLED': return <CheckCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="card-luxury p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-800 rounded w-1/4" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
              <div className="h-3 bg-gray-800 rounded w-1/3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-white">Case Management</h2>
          <p className="text-gray-400 mt-1">
            Manage legal cases with blockchain-verified evidence chains
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium btn-luxury"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Case
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-luxury p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900/50 border-gray-800 text-white"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-gray-900/50 border-gray-800 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DISCOVERY">Discovery</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="SETTLED">Settled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-gray-900/50 border-gray-800 text-white">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="CIVIL">Civil</SelectItem>
              <SelectItem value="CRIMINAL">Criminal</SelectItem>
              <SelectItem value="FAMILY">Family</SelectItem>
              <SelectItem value="CORPORATE">Corporate</SelectItem>
              <SelectItem value="PROPERTY">Property</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400">
              {filteredCases.length} of {cases.length} cases
            </span>
          </div>
        </div>
      </Card>

      {/* Cases Grid */}
      <div className="grid gap-4">
        <AnimatePresence>
          {filteredCases.map((caseItem, index) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="card-luxury p-6 hover-luxury cursor-pointer group"
                    onClick={() => handleViewCase(caseItem)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Case Header */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/10">
                        <Scale className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                          {caseItem.caseNumber}
                        </h3>
                        <p className="text-sm text-gray-400">{caseItem.caseType}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusColors[caseItem.status]} text-xs border`}>
                          {getStatusIcon(caseItem.status)}
                          <span className="ml-1">{caseItem.status}</span>
                        </Badge>
                        <Badge className={`${priorityColors[caseItem.priority]} text-xs`}>
                          {caseItem.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* Case Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Petitioner:</span>
                        <p className="text-white font-medium truncate">{caseItem.petitioner}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Respondent:</span>
                        <p className="text-white font-medium truncate">{caseItem.respondent || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Judge:</span>
                        <p className="text-white font-medium truncate">{caseItem.judge || 'Unassigned'}</p>
                      </div>
                    </div>

                    {/* Case Stats */}
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{caseItem.artifactCount} artifacts</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Filed {new Date(caseItem.filingDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Updated {new Date(caseItem.lastActivity).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {caseItem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {caseItem.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-gray-400 border-gray-700">
                            {tag}
                          </Badge>
                        ))}
                        {caseItem.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs text-gray-400 border-gray-700">
                            +{caseItem.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                      <DropdownMenuItem onClick={() => handleViewCase(caseItem)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Case
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteCase(caseItem.id)}
                        className="text-red-400 focus:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Case
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredCases.length === 0 && !isLoading && (
          <Card className="card-luxury p-12 text-center">
            <Scale className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No cases found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters to see more cases'
                : 'Get started by creating your first case'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Case
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Modals */}
      <CreateCaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCaseCreated={handleCaseCreated}
      />

      {selectedCase && (
        <CaseDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          caseData={selectedCase}
        />
      )}
    </div>
  );
}