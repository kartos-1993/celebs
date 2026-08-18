import React, { memo, useCallback, useMemo, useState } from 'react';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { toast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { VendorBrandAuthorization } from '@celebs/shared-types';
import { BrandAuthorizationDialog } from '../components/brand-authorization-dialog';
import { useMyBrandAuthorizations } from '../hooks/use-brands';

export const BrandAuthorizationsPage = memo(function BrandAuthorizationsPage() {
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const { data: authorizations = [], isLoading, refetch } = useMyBrandAuthorizations();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
            <Clock className="h-3 w-3" /> Pending Review
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      case 'UNDER_REVIEW':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> In Verification
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Brand Authorizations &amp; LOA Registry
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your brand distribution rights, dealership certificates, and trademark permissions.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsApplyOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Apply for Brand Authorization
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Approved Brands
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">
              {authorizations.filter((a) => a.status === 'APPROVED').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Authorized for catalog publishing</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Pending Applications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">
              {authorizations.filter((a) => a.status === 'PENDING').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Under compliance inspection</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Trademark Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-primary">100%</div>
            <p className="text-xs text-muted-foreground mt-1">Anti-hijacking IP screening active</p>
          </CardContent>
        </Card>
      </div>

      {/* Authorizations List */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="p-4 border-b border-border/40">
          <CardTitle className="text-base font-semibold">Your Brand Authorizations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : authorizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">No brand authorizations requested</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If you sell authentic branded goods (e.g. Nike, Zara, Levi&apos;s), apply for authorization to list products.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsApplyOpen(true)} className="mt-2 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Apply Now
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {authorizations.map((auth) => (
                <div
                  key={auth.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {auth.brand?.name || 'Brand'}
                        </span>
                        {getStatusBadge(auth.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Doc Type: <span className="font-medium text-foreground">{auth.documentType}</span>
                        {auth.documentExpiryDate && (
                          <> • Expires: {new Date(auth.documentExpiryDate).toLocaleDateString()}</>
                        )}
                      </p>
                      {auth.rejectionReason && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Rejection Reason: {auth.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(auth.documentUrl, '_blank')}
                      className="text-xs h-8 gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" /> View Document
                      <ExternalLink className="h-3 w-3 ml-0.5 opacity-60" />
                    </Button>
                    {auth.status === 'REJECTED' && (
                      <Button
                        size="sm"
                        onClick={() => setIsApplyOpen(true)}
                        className="text-xs h-8"
                      >
                        Re-apply
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Dialog */}
      <BrandAuthorizationDialog open={isApplyOpen} onOpenChange={setIsApplyOpen} />
    </div>
  );
});

export default BrandAuthorizationsPage;
