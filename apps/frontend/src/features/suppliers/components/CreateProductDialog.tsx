import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { productApi, CreateProductData } from '@/lib/api/products';
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

const createProductSchema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  productName: z.string().min(1, 'Product name is required'),
  productCategory: z.enum(['raw_materials', 'components', 'finished_goods', 'mro', 'services', 'other']),
  description: z.string().optional(),
  unitOfMeasure: z.string().default('piece'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  currency: z.string().length(3).default('USD'),
  minimumOrderQuantity: z.number().positive().default(1),
  leadTimeDays: z.number().int().positive().optional(),
});

interface CreateProductDialogProps {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProductDialog({
  supplierId,
  open,
  onOpenChange,
  onSuccess,
}: CreateProductDialogProps) {
  const { toast } = useToast();

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
      await createMutation.mutateAsync({
        supplierId,
        ...value,
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { supplierId: string } & CreateProductData) =>
      productApi.createProduct(data.supplierId, data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Product created successfully',
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create product',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>Add a new product to your catalog</DialogDescription>
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
            name="productCode"
            validators={{
            }}
          >
            {(field) => (
              <FormInput
                label="Product Code"
                required
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                placeholder="PROD-001"
              />
            )}
          </form.Field>

          <form.Field
            name="productName"
            validators={{
            }}
          >
            {(field) => (
              <FormInput
                label="Product Name"
                required
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                placeholder="Enter product name"
              />
            )}
          </form.Field>

          <form.Field
            name="productCategory"
            validators={{
            }}
          >
            {(field) => (
              <FormField label="Category" required error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_materials">Raw Materials</SelectItem>
                    <SelectItem value="components">Components</SelectItem>
                    <SelectItem value="finished_goods">Finished Goods</SelectItem>
                    <SelectItem value="mro">MRO</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <FormTextarea
                label="Description (Optional)"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter product description"
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
                  required
                  value={field.state.value?.toString() || '0'}
                  onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                />
              )}
            </form.Field>

            <form.Field name="currency">
              {(field) => (
                <FormField label="Currency">
                  <Select
                    value={field.state.value || 'USD'}
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <form.Field name="leadTimeDays">
              {(field) => (
                <FormInput
                  label="Lead Time (Days)"
                  type="number"
                  value={field.state.value?.toString() || ''}
                  onChange={(e) =>
                    field.handleChange(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="Optional"
                />
              )}
            </form.Field>
          </div>

          <form.Field name="unitOfMeasure">
            {(field) => (
              <FormInput
                label="Unit of Measure"
                value={field.state.value || 'piece'}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="piece, kg, m, etc."
              />
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

