import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { partnerSupplierCatalogApi } from '@/lib/api/partnerSupplierCatalog';
import type { CreateProductData } from '@/lib/api/products';
import { useToast } from '@/lib/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PartnerCreateProductDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: CreateProductData) => partnerSupplierCatalogApi.createProduct(data),
    onSuccess: () => {
      toast({ title: 'Product created' });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e: any) => {
      toast({
        title: 'Error',
        description: e?.response?.data?.message || 'Failed to create product',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<CreateProductData>({
    defaultValues: {
      productCode: '',
      productName: '',
      productCategory: 'finished_goods',
      unitOfMeasure: 'piece',
      unitPrice: 0,
      currency: 'USD',
      minimumOrderQuantity: 1,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>New products are submitted as pending approval.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="productCode">
            {(field) => (
              <FormInput label="Product code" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
            )}
          </form.Field>
          <form.Field name="productName">
            {(field) => (
              <FormInput label="Product name" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
            )}
          </form.Field>
          <form.Field name="productCategory">
            {(field) => (
              <FormField label="Category">
                <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as CreateProductData['productCategory'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_materials">Raw materials</SelectItem>
                    <SelectItem value="components">Components</SelectItem>
                    <SelectItem value="finished_goods">Finished goods</SelectItem>
                    <SelectItem value="mro">MRO</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </form.Field>
          <form.Field name="unitPrice">
            {(field) => (
              <FormInput
                label="Unit price"
                type="number"
                value={String(field.state.value)}
                onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
              />
            )}
          </form.Field>
          <form.Field name="description">
            {(field) => (
              <FormTextarea label="Description" value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} />
            )}
          </form.Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
