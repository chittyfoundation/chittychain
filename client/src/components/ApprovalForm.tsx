import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export function ApprovalForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    requestType: 'tenant_screening',
    requestDate: new Date().toISOString().split('T')[0],
    requestTime: '12:00',
    location: '',
    description: '',
    recipients: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const recipients = formData.recipients.split(',').map(r => r.trim()).filter(Boolean);
      
      const response = await fetch('/api/v1/approvals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          recipients,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Approval request created! ID: ${data.requestId}`);
        setFormData({
          title: '',
          requestType: 'tenant_screening',
          requestDate: new Date().toISOString().split('T')[0],
          requestTime: '12:00',
          location: '',
          description: '',
          recipients: '',
        });
      } else {
        alert('Failed to create approval request');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating approval request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Approval Request</CardTitle>
        <CardDescription>
          Create a multi-party approval request with blockchain verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Tenant Approval - John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Request Type</Label>
            <Select
              value={formData.requestType}
              onValueChange={(value) => setFormData({ ...formData, requestType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant_screening">Tenant Screening</SelectItem>
                <SelectItem value="lease_approval">Lease Approval</SelectItem>
                <SelectItem value="maintenance_approval">Maintenance Approval</SelectItem>
                <SelectItem value="eviction_approval">Eviction Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.requestDate}
                onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.requestTime}
                onChange={(e) => setFormData({ ...formData, requestTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="123 Main St, Chicago, IL"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about the approval request..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="recipients">Recipients (comma-separated)</Label>
            <Input
              id="recipients"
              value={formData.recipients}
              onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
              placeholder="john@example.com, +1234567890, jane@example.com"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Approval Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}