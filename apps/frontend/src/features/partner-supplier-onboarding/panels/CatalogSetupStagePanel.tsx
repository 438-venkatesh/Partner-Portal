import { Link } from '@tanstack/react-router';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { partnerSupplierCatalogApi } from '@/lib/api/partnerSupplierCatalog';

import { partnerSupplierOnboardingApi } from '@/lib/api/partnerSupplierOnboarding';

import { Button } from '@/components/ui/button';

import { ExternalLink } from 'lucide-react';

import { useToast } from '@/lib/hooks/use-toast';

import { SupplierCatalogSection } from '../SupplierCatalogSection';



interface Props {

  editable: boolean;

  submitted: boolean;

  onSubmitted?: () => void;

}



export function CatalogSetupStagePanel({ editable, submitted, onSubmitted }: Props) {

  const { toast } = useToast();

  const queryClient = useQueryClient();



  const { data, isLoading } = useQuery({

    queryKey: ['partner-supplier-products'],

    queryFn: () => partnerSupplierCatalogApi.getProducts({ limit: 100 }),

  });



  const submitMutation = useMutation({

    mutationFn: () => partnerSupplierOnboardingApi.submitStage('catalog_setup'),

    onSuccess: () => {

      toast({ title: 'Catalog submitted for review' });

      queryClient.invalidateQueries({ queryKey: ['partner-supplier-onboarding'] });

      onSubmitted?.();

    },

    onError: (e: unknown) => {

      const err = e as { response?: { data?: { message?: string; details?: string[] } } };

      const details = err?.response?.data?.details;

      toast({

        title: 'Cannot submit yet',

        description: Array.isArray(details) ? details.join('. ') : err?.response?.data?.message,

        variant: 'destructive',

      });

    },

  });



  const products = data?.products ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['partner-supplier-products'] });



  return (

    <SupplierCatalogSection

      products={products}

      isLoading={isLoading}

      submitted={submitted}

      editable={editable}

      variant="stage"

      onRefresh={refresh}

      onSubmit={editable && !submitted ? () => submitMutation.mutate() : undefined}

      submitPending={submitMutation.isPending}

      extraActions={

        <Button variant="outline" size="sm" asChild>

          <Link to="/partner/onboarding/supplier/catalog">

            <ExternalLink className="h-4 w-4 mr-2" />

            Full manager

          </Link>

        </Button>

      }

    />

  );

}


