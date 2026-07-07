import { useForm } from '@tanstack/react-form';
import { acknowledgePOSchema, type AcknowledgePOInput } from '@partner-portal/common';
import { Button } from '@/components/ui/button';
import { FormTextarea, FormSelect } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { supplierApi } from '@/lib/api/suppliers';
import { Check, X } from 'lucide-react';

interface POAcknowledgmentFormProps {
  poId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function POAcknowledgmentForm({ poId, open, onOpenChange, onSuccess }: POAcknowledgmentFormProps) {
  const { toast } = useToast();

  const form = useForm<AcknowledgePOInput>({
    defaultValues: {
      acknowledged: true,
    },
    onSubmit: async ({ value }) => {
      try {
        await supplierApi.acknowledgePO(poId, value.acknowledged, value.modifications, value.rejectionReason);
        toast({
          title: value.acknowledged ? "PO Acknowledged" : "PO Rejected",
          description: value.acknowledged 
            ? "Purchase order has been acknowledged successfully"
            : "Purchase order has been rejected",
        });
        onSuccess?.();
        onOpenChange(false);
        form.reset();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update purchase order",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Acknowledge Purchase Order</DialogTitle>
          <DialogDescription>
            Review and acknowledge or reject this purchase order
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="acknowledged"
            validators={{
            }}
          >
            {(field) => (
              <FormSelect
                label="Action"
                required
                value={field.state.value ? 'acknowledge' : 'reject'}
                onValueChange={(value) => field.handleChange(value === 'acknowledge')}
                placeholder="Select action"
              >
                <SelectItem value="acknowledge">Acknowledge</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
              </FormSelect>
            )}
          </form.Field>

          <form.Field
            name="rejectionReason"
            validators={{
              onChange: ({ value }) => {
                if (!form.state.values.acknowledged && !value) {
                  return 'Rejection reason is required';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              form.state.values.acknowledged ? null : (
                <FormTextarea
                  label="Rejection Reason"
                  required
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  rows={3}
                />
              )
            )}
          </form.Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={form.state.isSubmitting}
              variant={form.state.values.acknowledged ? "default" : "destructive"}
            >
              {form.state.isSubmitting 
                ? 'Processing...' 
                : form.state.values.acknowledged 
                  ? 'Acknowledge' 
                  : 'Reject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

