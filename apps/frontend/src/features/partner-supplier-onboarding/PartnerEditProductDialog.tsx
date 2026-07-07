import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { partnerSupplierCatalogApi } from '@/lib/api/partnerSupplierCatalog';
import type { Product, UpdateProductData } from '@/lib/api/products';
import { useToast } from '@/lib/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';

interface Props {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PartnerEditProductDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (data: UpdateProductData) => partnerSupplierCatalogApi.updateProduct(product.productId, data),
    onSuccess: () => {
      toast({ title: 'Product updated' });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e: any) => {
      toast({
        title: 'Error',
        description: e?.response?.data?.message || 'Update failed',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<UpdateProductData>({
    defaultValues: {
      productName: product.productName,
      description: product.description,
      unitPrice: Number(product.unitPrice),
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {product.productCode}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="productName">
            {(field) => (
              <FormInput label="Name" value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} />
            )}
          </form.Field>
          <form.Field name="unitPrice">
            {(field) => (
              <FormInput
                label="Unit price"
                type="number"
                value={String(field.state.value ?? 0)}
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
            <Button type="submit" disabled={mutation.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
