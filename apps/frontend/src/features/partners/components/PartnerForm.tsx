import { useForm } from '@tanstack/react-form';
import { createPartnerSchema, type CreatePartnerInput } from '@partner-portal/common';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/hooks/use-toast';
import { partnerApi } from '@/lib/api/partners';
import { useNavigate } from '@tanstack/react-router';

interface PartnerFormProps {
  onSuccess?: () => void;
}

export function PartnerForm({ onSuccess }: PartnerFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<CreatePartnerInput>({
    defaultValues: {
      partnerName: '',
      partnerType: 'agency',
      businessType: 'b2b',
    },
    onSubmit: async ({ value }) => {
      try {
        const partner = await partnerApi.create(value);
        toast({
          title: "Success",
          description: "Partner created successfully",
        });
        onSuccess?.();
        navigate({ to: '/partners/$partnerId', params: { partnerId: partner.partnerId } });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create partner",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Partner</CardTitle>
        <CardDescription>Add a new partner to the system</CardDescription>
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
                value={field.state.value}
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
                value={field.state.value}
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
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? 'Creating...' : 'Create Partner'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

