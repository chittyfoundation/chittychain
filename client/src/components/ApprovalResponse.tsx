import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Calendar, MapPin, Clock } from 'lucide-react';

interface ApprovalDetails {
  requestId: string;
  title: string;
  requestType: string;
  requestDate: string;
  requestTime: string;
  location: string;
  description: string;
  status: string;
  responses: Array<{
    recipient: string;
    response: string;
    respondedAt: string;
  }>;
}

export function ApprovalResponse() {
  const { id } = useParams<{ id: string }>();
  const [approval, setApproval] = useState<ApprovalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [recipient, setRecipient] = useState('');

  useEffect(() => {
    fetchApproval();
  }, [id]);

  const fetchApproval = async () => {
    try {
      const response = await fetch(`/api/v1/approvals/${id}`);
      if (response.ok) {
        const data = await response.json();
        setApproval(data);
      }
    } catch (error) {
      console.error('Error fetching approval:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (response: 'approved' | 'denied') => {
    if (!recipient) {
      alert('Please enter your email or phone number');
      return;
    }

    setResponding(true);
    try {
      const res = await fetch(`/api/v1/approvals/${id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response,
          recipient,
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        alert(`Your ${response} response has been recorded!`);
        fetchApproval();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to record response');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error recording response');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!approval) {
    return <div className="text-center p-8">Approval request not found</div>;
  }

  const hasResponded = approval.responses.some(r => r.recipient === recipient);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{approval.title}</CardTitle>
          <CardDescription>
            Request ID: {approval.requestId} | Status: {approval.status}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{approval.requestDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{approval.requestTime}</span>
            </div>
          </div>

          {approval.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{approval.location}</span>
            </div>
          )}

          {approval.description && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm">{approval.description}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Responses</h3>
            <div className="space-y-2">
              {approval.responses.map((resp, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span>{resp.recipient}</span>
                  <span className={resp.response === 'approved' ? 'text-green-600' : 'text-red-600'}>
                    {resp.response}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!hasResponded && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Email or Phone
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter your email or phone number"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => handleResponse('approved')}
                  disabled={responding || !recipient}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleResponse('denied')}
                  disabled={responding || !recipient}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deny
                </Button>
              </div>
            </div>
          )}

          {hasResponded && (
            <div className="border-t pt-4 text-center text-green-600">
              ✓ You have already responded to this request
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}