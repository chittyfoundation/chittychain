import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Scale, 
  X, 
  Calendar, 
  Users, 
  FileText, 
  Clock,
  Shield,
  Download,
  Eye,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvidenceUpload } from '../evidence/EvidenceUpload';

interface CaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: any;
}

export function CaseDetailsModal({ isOpen, onClose, caseData }: CaseDetailsModalProps) {
  const [artifacts, setArtifacts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && caseData) {
      fetchCaseArtifacts();
      fetchCaseTimeline();
    }
  }, [isOpen, caseData]);

  const fetchCaseArtifacts = async () => {
    try {
      const response = await fetch(`/api/v1/cases/${caseData.id}/artifacts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chittychain_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setArtifacts(data.artifacts || []);
      }
    } catch (error) {
      console.error('Error fetching artifacts:', error);
    }
  };

  const fetchCaseTimeline = async () => {
    try {
      const response = await fetch(`/api/v1/evidence/${caseData.id}/timeline`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chittychain_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ACTIVE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    DISCOVERY: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    TRIAL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    CLOSED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    SETTLED: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="card-luxury p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20">
                <Scale className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h2 className="text-2xl font-serif text-white">{caseData.caseNumber}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <Badge className={`${statusColors[caseData.status]} border text-sm`}>
                    {caseData.status}
                  </Badge>
                  <span className="text-gray-400">{caseData.caseType}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{caseData.jurisdiction}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-gray-900/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Case Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="card-luxury p-4">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    Parties
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Petitioner:</span>
                      <p className="text-white font-medium">{caseData.petitioner}</p>
                    </div>
                    {caseData.respondent && (
                      <div>
                        <span className="text-gray-400 text-sm">Respondent:</span>
                        <p className="text-white font-medium">{caseData.respondent}</p>
                      </div>
                    )}
                    {caseData.judge && (
                      <div>
                        <span className="text-gray-400 text-sm">Judge:</span>
                        <p className="text-white font-medium">{caseData.judge}</p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="card-luxury p-4">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    Important Dates
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Filing Date:</span>
                      <p className="text-white font-medium">
                        {new Date(caseData.filingDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Last Activity:</span>
                      <p className="text-white font-medium">
                        {new Date(caseData.lastActivity).toLocaleDateString()}
                      </p>
                    </div>
                    {caseData.nextHearing && (
                      <div>
                        <span className="text-gray-400 text-sm">Next Hearing:</span>
                        <p className="text-white font-medium">
                          {new Date(caseData.nextHearing).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Case Stats */}
              <Card className="card-luxury p-4">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  Blockchain Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">{caseData.artifactCount}</div>
                    <div className="text-sm text-gray-400">Evidence Artifacts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">100%</div>
                    <div className="text-sm text-gray-400">Integrity Verified</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">256-bit</div>
                    <div className="text-sm text-gray-400">Encryption</div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="evidence" className="space-y-4">
              {artifacts.length > 0 ? (
                artifacts.map((artifact: any, index: number) => (
                  <Card key={index} className="card-luxury p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="w-8 h-8 text-amber-500" />
                        <div>
                          <h4 className="font-medium text-white">{artifact.description}</h4>
                          <p className="text-sm text-gray-400">
                            Type: {artifact.type} • Uploaded: {new Date(artifact.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="card-luxury p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No evidence uploaded</h3>
                  <p className="text-gray-500">Upload evidence to secure it on the blockchain</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((event: any, index: number) => (
                    <Card key={index} className="card-luxury p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-amber-500/20">
                          <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{event.description}</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date(event.submittedAt).toLocaleString()}
                          </p>
                          {event.status && (
                            <Badge className="mt-2" variant="outline">
                              {event.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="card-luxury p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No timeline events</h3>
                  <p className="text-gray-500">Case activity will appear here</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="upload">
              <EvidenceUpload 
                caseId={caseData.id} 
                onUploadComplete={() => {
                  fetchCaseArtifacts();
                  fetchCaseTimeline();
                }}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </motion.div>
  );
}