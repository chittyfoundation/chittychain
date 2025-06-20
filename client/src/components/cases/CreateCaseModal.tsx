import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Calendar, Users, MapPin, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (caseData: any) => void;
}

interface CaseFormData {
  caseType: string;
  jurisdiction: string;
  petitioner: string;
  respondent: string;
  judge: string;
  filingDate: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
}

export function CreateCaseModal({ isOpen, onClose, onCaseCreated }: CreateCaseModalProps) {
  const [formData, setFormData] = useState<CaseFormData>({
    caseType: '',
    jurisdiction: 'ILLINOIS-COOK',
    petitioner: '',
    respondent: '',
    judge: '',
    filingDate: new Date().toISOString().split('T')[0],
    description: '',
    priority: 'medium',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const caseTypes = [
    'CIVIL',
    'CRIMINAL', 
    'FAMILY',
    'CORPORATE',
    'PROPERTY',
    'EMPLOYMENT',
    'PERSONAL_INJURY',
    'INTELLECTUAL_PROPERTY',
    'BANKRUPTCY',
    'IMMIGRATION'
  ];

  const jurisdictions = [
    'ILLINOIS-COOK',
    'ILLINOIS-DUPAGE', 
    'ILLINOIS-LAKE',
    'ILLINOIS-WILL',
    'ILLINOIS-KANE',
    'FEDERAL-NORTHERN',
    'FEDERAL-CENTRAL',
    'FEDERAL-SOUTHERN'
  ];

  const handleInputChange = (field: keyof CaseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(tag => tag !== tagToRemove) 
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/cases/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('chittychain_token')}`,
        },
        body: JSON.stringify({
          ...formData,
          metadata: {
            description: formData.description,
            priority: formData.priority,
            tags: formData.tags,
            createdAt: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create case');
      }

      const caseData = await response.json();
      onCaseCreated(caseData);
      
      toast({
        title: "Case Created Successfully",
        description: `Case ${caseData.caseNumber} has been created and secured on the blockchain.`,
      });

      // Reset form
      setFormData({
        caseType: '',
        jurisdiction: 'ILLINOIS-COOK',
        petitioner: '',
        respondent: '',
        judge: '',
        filingDate: new Date().toISOString().split('T')[0],
        description: '',
        priority: 'medium',
        tags: [],
      });
      setTagInput('');

    } catch (error) {
      console.error('Case creation error:', error);
      toast({
        title: "Case Creation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="card-luxury p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20">
                <Scale className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-serif text-white">Create New Case</h2>
                <p className="text-sm text-gray-400">Initialize a blockchain-secured legal case</p>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Case Type & Jurisdiction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseType" className="text-gray-300">Case Type *</Label>
                <Select value={formData.caseType} onValueChange={(value) => handleInputChange('caseType', value)}>
                  <SelectTrigger className="bg-gray-900/50 border-gray-800 text-white">
                    <SelectValue placeholder="Select case type" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseTypes.map(type => (
                      <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jurisdiction" className="text-gray-300">Jurisdiction *</Label>
                <Select value={formData.jurisdiction} onValueChange={(value) => handleInputChange('jurisdiction', value)}>
                  <SelectTrigger className="bg-gray-900/50 border-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {jurisdictions.map(jurisdiction => (
                      <SelectItem key={jurisdiction} value={jurisdiction}>{jurisdiction}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parties */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="petitioner" className="text-gray-300 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Petitioner/Plaintiff *
                </Label>
                <Input
                  id="petitioner"
                  value={formData.petitioner}
                  onChange={(e) => handleInputChange('petitioner', e.target.value)}
                  placeholder="Enter petitioner name"
                  className="bg-gray-900/50 border-gray-800 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="respondent" className="text-gray-300">Respondent/Defendant</Label>
                <Input
                  id="respondent"
                  value={formData.respondent}
                  onChange={(e) => handleInputChange('respondent', e.target.value)}
                  placeholder="Enter respondent name (optional)"
                  className="bg-gray-900/50 border-gray-800 text-white"
                />
              </div>
            </div>

            {/* Judge & Filing Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="judge" className="text-gray-300">Assigned Judge</Label>
                <Input
                  id="judge"
                  value={formData.judge}
                  onChange={(e) => handleInputChange('judge', e.target.value)}
                  placeholder="Judge name (if assigned)"
                  className="bg-gray-900/50 border-gray-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filingDate" className="text-gray-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Filing Date *
                </Label>
                <Input
                  id="filingDate"
                  type="date"
                  value={formData.filingDate}
                  onChange={(e) => handleInputChange('filingDate', e.target.value)}
                  className="bg-gray-900/50 border-gray-800 text-white"
                  required
                />
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-gray-300">Case Priority</Label>
              <Select value={formData.priority} onValueChange={(value: any) => handleInputChange('priority', value)}>
                <SelectTrigger className="bg-gray-900/50 border-gray-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Case Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the case..."
                className="bg-gray-900/50 border-gray-800 text-white resize-none h-24"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-gray-300">Case Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags..."
                  className="bg-gray-900/50 border-gray-800 text-white"
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Add
                </Button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-amber-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.caseType || !formData.petitioner}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium btn-luxury"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-black border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <Scale className="w-4 h-4 mr-2" />
                    Create Case
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}