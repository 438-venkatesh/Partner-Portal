import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerOnboardingApi } from '@/lib/api/partnerOnboarding';
import { partnerSupplierOnboardingApi } from '@/lib/api/partnerSupplierOnboarding';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/hooks/use-toast';
import { Building2 } from 'lucide-react';

export type PartnerRegistrationTrack = 'service' | 'supplier';

interface OrgShape {
  partnerName?: string;
  displayName?: string | null;
  website?: string | null;
  description?: string | null;
}

interface Props {
  /** Which onboarding API completes the registration stage */
  track: PartnerRegistrationTrack;
  org?: OrgShape;
  editable: boolean;
  onComplete: () => void;
  submitting?: boolean;
}

/**
 * Single registration form for all partner types (service + supplier onboarding).
 * Company profile fields and terms acceptance are identical; only the submit API differs by track.
 */
export function PartnerRegistrationStagePanel({
  track,
  org,
  editable,
  onComplete,
  submitting = false,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(org?.displayName ?? '');
  const [website, setWebsite] = useState(org?.website ?? '');
  const [description, setDescription] = useState(org?.description ?? '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  React.useEffect(() => {
    if (!org) return;
    setDisplayName(org.displayName ?? '');
    setWebsite(org.website ?? '');
    setDescription(org.description ?? '');
  }, [org]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const profile = {
        displayName: displayName.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
      };

      if (track === 'service') {
        return partnerOnboardingApi.submitRegistration({
          acceptedTerms: true,
          ...profile,
        });
      }

      await partnerAuthApi.updateOrganization(profile);
      await partnerSupplierOnboardingApi.updateProfile({ acceptedTerms: true });
      return partnerSupplierOnboardingApi.submitStage('supplier_registration');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['partner-supplier-onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['partner-organization'] });
      onComplete();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string; details?: string[] } } };
      const details = err?.response?.data?.details;
      toast({
        title: 'Registration failed',
        description: Array.isArray(details) ? details.join('. ') : err?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50/90 to-white pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Partner registration</CardTitle>
            <CardDescription>
              Confirm your company profile and accept the partner terms to continue onboarding.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <FormInput label="Legal company name" value={org?.partnerName ?? ''} disabled />
        <FormInput
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={!editable}
          placeholder="Shown in the portal header"
        />
        <FormInput
          label="Website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={!editable}
          placeholder="https://example.com"
        />
        <FormTextarea
          label="Company description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!editable}
          rows={3}
          placeholder="Brief overview of your company and what you offer"
        />
        <div className="flex items-start gap-2 rounded-md border p-4 bg-muted/30">
          <Checkbox
            id="partner-terms"
            checked={acceptedTerms}
            onCheckedChange={(v) => setAcceptedTerms(v === true)}
            disabled={!editable}
          />
          <Label htmlFor="partner-terms" className="text-sm leading-relaxed cursor-pointer">
            I accept the partner terms and conditions and confirm that the information provided is
            accurate.
          </Label>
        </div>
        {editable && (
          <Button
            className="w-full sm:w-auto"
            disabled={!acceptedTerms || saveMutation.isPending || submitting}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending || submitting ? 'Saving…' : 'Complete registration & continue'}
          </Button>
        )}
        {!editable && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/partner/onboarding">Back to onboarding</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
