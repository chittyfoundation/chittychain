import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, Shield, AlertCircle, CheckCircle, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EvidenceFile {
  id: string;
  file: File;
  status: 'uploading' | 'hashing' | 'binding' | 'complete' | 'error';
  hash?: string;
  artifactId?: string;
  progress: number;
  error?: string;
}

interface EvidenceUploadProps {
  caseId: string;
  onUploadComplete?: (artifactId: string) => void;
}

export function EvidenceUpload({ caseId, onUploadComplete }: EvidenceUploadProps) {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [evidenceType, setEvidenceType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'text/plain'];
  const maxFileSize = 100 * 1024 * 1024; // 100MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} not allowed`;
    }
    if (file.size > maxFileSize) {
      return 'File size exceeds 100MB limit';
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const processFiles = (fileList: File[]) => {
    const newFiles: EvidenceFile[] = [];

    fileList.forEach(file => {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "File Validation Error",
          description: `${file.name}: ${error}`,
          variant: "destructive",
        });
        return;
      }

      const evidenceFile: EvidenceFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: 'uploading',
        progress: 0,
      };

      newFiles.push(evidenceFile);
    });

    setFiles(prev => [...prev, ...newFiles]);
    
    // Start processing each file
    newFiles.forEach(processFile);
  };

  const processFile = async (evidenceFile: EvidenceFile) => {
    try {
      // Step 1: Hash the file
      updateFileStatus(evidenceFile.id, 'hashing', 25);
      const hash = await calculateFileHash(evidenceFile.file);
      
      // Step 2: Upload to IPFS
      updateFileStatus(evidenceFile.id, 'uploading', 50);
      const formData = new FormData();
      formData.append('file', evidenceFile.file);
      formData.append('hash', hash);
      
      const uploadResponse = await fetch('/api/v1/evidence/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chittychain_token')}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();

      // Step 3: Bind to blockchain
      updateFileStatus(evidenceFile.id, 'binding', 75);
      const bindResponse = await fetch('/api/v1/artifacts/bind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('chittychain_token')}`,
        },
        body: JSON.stringify({
          case_id: caseId,
          evidence_type: evidenceType || 'document',
          description: description || evidenceFile.file.name,
          file_hash: hash,
          ipfs_hash: uploadData.ipfsHash,
          metadata: {
            filename: evidenceFile.file.name,
            fileSize: evidenceFile.file.size,
            mimeType: evidenceFile.file.type,
            uploadedAt: new Date().toISOString(),
          },
        }),
      });

      if (!bindResponse.ok) {
        throw new Error('Blockchain binding failed');
      }

      const bindData = await bindResponse.json();

      // Complete
      setFiles(prev => prev.map(f => 
        f.id === evidenceFile.id 
          ? { ...f, status: 'complete', progress: 100, hash, artifactId: bindData.artifact_id }
          : f
      ));

      toast({
        title: "Evidence Uploaded Successfully",
        description: `Artifact ID: ${bindData.artifact_id}`,
      });

      onUploadComplete?.(bindData.artifact_id);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFiles(prev => prev.map(f => 
        f.id === evidenceFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));

      toast({
        title: "Upload Failed",
        description: `${evidenceFile.file.name}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const updateFileStatus = (id: string, status: EvidenceFile['status'], progress: number) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status, progress } : f
    ));
  };

  const calculateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const getStatusIcon = (status: EvidenceFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'hashing':
      case 'binding':
        return <div className="animate-spin w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: EvidenceFile['status']) => {
    switch (status) {
      case 'uploading': return 'Uploading to IPFS...';
      case 'hashing': return 'Calculating hash...';
      case 'binding': return 'Binding to blockchain...';
      case 'complete': return 'Evidence secured';
      case 'error': return 'Upload failed';
    }
  };

  return (
    <Card className="card-luxury p-6">
      <div className="mb-6">
        <h3 className="text-xl font-serif text-white mb-2">Submit Evidence</h3>
        <p className="text-gray-400 text-sm">
          Upload legal documents with cryptographic verification and blockchain binding
        </p>
      </div>

      {/* Evidence Metadata Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="evidenceType" className="text-gray-300">Evidence Type</Label>
          <Select value={evidenceType} onValueChange={setEvidenceType}>
            <SelectTrigger className="bg-gray-900/50 border-gray-800 text-white">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="document">Legal Document</SelectItem>
              <SelectItem value="photograph">Photograph</SelectItem>
              <SelectItem value="video">Video Recording</SelectItem>
              <SelectItem value="audio">Audio Recording</SelectItem>
              <SelectItem value="digital">Digital Evidence</SelectItem>
              <SelectItem value="exhibit">Court Exhibit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-300">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the evidence..."
            className="bg-gray-900/50 border-gray-800 text-white resize-none h-[42px]"
          />
        </div>
      </div>

      {/* Drag & Drop Area */}
      <motion.div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-colors",
          dragActive 
            ? "border-amber-500 bg-amber-500/5" 
            : "border-gray-700 hover:border-gray-600"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
      >
        <input
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={(e) => processFiles(Array.from(e.target.files || []))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-4">
          <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20">
            <Upload className="w-8 h-8 text-amber-500" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-white">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Supports PDF, images, videos up to 100MB
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="w-4 h-4" />
            <span>256-bit encryption • Blockchain verified • Tamper-proof</span>
          </div>
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-3"
          >
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-4 p-4 bg-gray-900/30 rounded-lg border border-gray-800"
              >
                <File className="w-8 h-8 text-gray-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {file.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(file.status)}
                    <span className="text-xs text-gray-400">
                      {getStatusText(file.status)}
                    </span>
                    {file.hash && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono">{file.hash.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                  
                  {file.status !== 'complete' && file.status !== 'error' && (
                    <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                      <motion.div
                        className="bg-amber-500 h-1 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                  
                  {file.error && (
                    <p className="text-xs text-red-400 mt-1">{file.error}</p>
                  )}
                  
                  {file.artifactId && (
                    <p className="text-xs text-green-400 mt-1 font-mono">
                      Artifact ID: {file.artifactId}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-red-400 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}