import { useForm } from '@tanstack/react-form';
import { updatePartnerSchema, type UpdatePartnerInput, type PartnerResponse } from '@partner-portal/common';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/hooks/use-toast';
import { partnerApi } from '@/lib/api/partners';
import { useQueryClient } from '@tanstack/react-query';

interface PartnerEditFormProps {
  partner: PartnerResponse;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PartnerEditForm({ partner, onSuccess, onCancel }: PartnerEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UpdatePartnerInput>({
    defaultValues: {
      partnerName: partner.partnerName,
      displayName: partner.displayName || '',
      partnerType: partner.partnerType,
      businessType: (partner.businessType || 'b2b') as 'both' | 'b2b' | 'b2c',
      website: partner.website || '',
      description: partner.description || '',
    },
    onSubmit: async ({ value }) => {
      try {
        await partnerApi.update(partner.partnerId, value);
        toast({
          title: "Success",
          description: "Partner updated successfully",
        });
        queryClient.invalidateQueries({ queryKey: ['partners', partner.partnerId] });
        queryClient.invalidateQueries({ queryKey: ['partners'] });
        onSuccess?.();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to update partner",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Partner</CardTitle>
        <CardDescription>Update partner information</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <form.Field
            name="partnerName"
          >
            {(field) => (
              <FormInput
                label="Partner Name"
                required
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
              />
            )}
          </form.Field>

          <form.Field name="displayName">
            {(field) => (
              <FormInput
                label="Display Name"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>

          <form.Field
            name="partnerType"
          >
            {(field) => (
              <FormSelect
                label="Partner Type"
                required
                value={field.state.value || ''}
                onValueChange={(value) => field.handleChange(value as any)}
                placeholder="Select partner type"
              >
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="reseller">Reseller</SelectItem>
                <SelectItem value="integrator">Integrator</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="logistics_partner">Logistics Partner</SelectItem>
              </FormSelect>
            )}
          </form.Field>

          <form.Field name="businessType">
            {(field) => (
              <FormSelect
                label="Business Type"
                value={field.state.value || ''}
                onValueChange={(value) => field.handleChange(value as any)}
                placeholder="Select business type"
              >
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </FormSelect>
            )}
          </form.Field>

          <form.Field name="website">
            {(field) => (
              <FormInput
                label="Website"
                type="url"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                hint="https://example.com"
              />
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <FormTextarea
                label="Description"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={4}
              />
            )}
          </form.Field>

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? 'Updating...' : 'Update Partner'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


