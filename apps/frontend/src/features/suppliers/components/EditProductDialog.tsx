import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { productApi, Product, UpdateProductData } from '@/lib/api/products';
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

const updateProductSchema = z.object({
  productName: z.string().min(1).optional(),
  description: z.string().optional(),
  unitPrice: z.number().nonnegative().optional(),
  minimumOrderQuantity: z.number().positive().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  status: z.enum(['active', 'inactive', 'discontinued', 'pending_approval']).optional(),
});

interface EditProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: EditProductDialogProps) {
  const { toast } = useToast();

  const form = useForm<UpdateProductData>({
    defaultValues: {
      productName: product.productName,
      description: product.description || '',
      unitPrice: product.unitPrice,
      minimumOrderQuantity: product.minimumOrderQuantity,
      leadTimeDays: product.leadTimeDays,
      status: product.status,
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        productId: product.productId,
        ...value,
      });
    },
  });

  useEffect(() => {
    if (open) {
      form.setFieldValue('productName', product.productName);
      form.setFieldValue('description', product.description || '');
      form.setFieldValue('unitPrice', product.unitPrice);
      form.setFieldValue('minimumOrderQuantity', product.minimumOrderQuantity);
      form.setFieldValue('leadTimeDays', product.leadTimeDays);
      form.setFieldValue('status', product.status);
    }
  }, [open, product]);

  const updateMutation = useMutation({
    mutationFn: (data: { productId: string } & UpdateProductData) =>
      productApi.updateProduct(data.productId, data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update product',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update product information</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="productName"
            validators={{
            }}
          >
            {(field) => (
              <FormInput
                label="Product Name"
                required
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
              />
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <FormTextarea
                label="Description"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                rows={3}
              />
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="unitPrice"
              validators={{
              }}
            >
              {(field) => (
                <FormInput
                  label="Unit Price"
                  type="number"
                  step="0.01"
                  value={field.state.value?.toString() || '0'}
                  onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                />
              )}
            </form.Field>

            <form.Field name="minimumOrderQuantity">
              {(field) => (
                <FormInput
                  label="Minimum Order Quantity"
                  type="number"
                  step="0.01"
                  value={field.state.value?.toString() || '1'}
                  onChange={(e) => field.handleChange(parseFloat(e.target.value) || 1)}
                />
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="leadTimeDays">
              {(field) => (
                <FormInput
                  label="Lead Time (Days)"
                  type="number"
                  value={field.state.value?.toString() || ''}
                  onChange={(e) =>
                    field.handleChange(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                />
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <FormField label="Status">
                  <Select
                    value={field.state.value || 'pending_approval'}
                    onValueChange={(value) => field.handleChange(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

