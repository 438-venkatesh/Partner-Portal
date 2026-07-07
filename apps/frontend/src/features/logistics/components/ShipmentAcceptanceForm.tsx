import { useForm } from '@tanstack/react-form';
import { type AcceptShipmentSchema } from '@partner-portal/common';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { logisticsApi } from '@/lib/api/logistics';

interface ShipmentAcceptanceFormProps {
  shipmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ShipmentAcceptanceForm({ shipmentId, open, onOpenChange, onSuccess }: ShipmentAcceptanceFormProps) {
  const { toast } = useToast();

  const form = useForm<AcceptShipmentSchema>({
    defaultValues: {
      accepted: true,
    },
    onSubmit: async ({ value }) => {
      try {
        await logisticsApi.acceptShipment(
          shipmentId,
          value.accepted,
          value.assignedDriver,
          value.vehicleNumber
        );
        toast({
          title: value.accepted ? "Shipment Accepted" : "Shipment Rejected",
          description: value.accepted 
            ? "Shipment has been accepted and assigned"
            : "Shipment has been rejected",
        });
        onSuccess?.();
        onOpenChange(false);
        form.reset();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update shipment",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Accept Shipment</DialogTitle>
          <DialogDescription>
            Accept or reject this shipment request
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
            name="accepted"
          >
            {(field) => (
              <FormSelect
                label="Action"
                required
                value={field.state.value ? 'accept' : 'reject'}
                onValueChange={(value) => field.handleChange(value === 'accept')}
                placeholder="Select action"
              >
                <SelectItem value="accept">Accept</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
              </FormSelect>
            )}
          </form.Field>

          {form.state.values.accepted && (
            <>
              <form.Field name="assignedDriver">
                {(field) => (
                  <FormInput
                    label="Assigned Driver"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>

              <form.Field name="vehicleNumber">
                {(field) => (
                  <FormInput
                    label="Vehicle Number"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </>
          )}

          <form.Field name="rejectionReason">
            {(field) => (
              !form.state.values.accepted ? (
                <FormTextarea
                  label="Rejection Reason"
                  required
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  rows={3}
                />
              ) : null
            )}
          </form.Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={form.state.isSubmitting}
              variant={form.state.values.accepted ? "default" : "destructive"}
            >
              {form.state.isSubmitting 
                ? 'Processing...' 
                : form.state.values.accepted 
                  ? 'Accept Shipment' 
                  : 'Reject Shipment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

