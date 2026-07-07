import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNavigate, Link } from '@tanstack/react-router';

import { partnerSupplierCatalogApi } from '@/lib/api/partnerSupplierCatalog';

import { partnerSupplierOnboardingApi } from '@/lib/api/partnerSupplierOnboarding';

import { useToast } from '@/lib/hooks/use-toast';

import { Button } from '@/components/ui/button';

import { ArrowLeft } from 'lucide-react';

import { SupplierOnboardingStageShell } from './SupplierOnboardingStageShell';

import { SupplierCatalogSection } from './SupplierCatalogSection';



export function PartnerSupplierCatalogPage() {

  const { toast } = useToast();

  const queryClient = useQueryClient();

  const navigate = useNavigate();



  const { data: workflowData, isLoading: workflowLoading } = useQuery({

    queryKey: ['partner-supplier-onboarding'],

    queryFn: () => partnerSupplierOnboardingApi.getWorkflow(),

  });



  const { data, isLoading } = useQuery({

    queryKey: ['partner-supplier-products'],

    queryFn: () => partnerSupplierCatalogApi.getProducts({ limit: 100 }),

  });



  const submitMutation = useMutation({

    mutationFn: () => partnerSupplierOnboardingApi.submitStage('catalog_setup'),

    onSuccess: () => {

      toast({ title: 'Catalog submitted for review' });

      queryClient.invalidateQueries({ queryKey: ['partner-supplier-onboarding'] });

      navigate({ to: '/partner/onboarding' });

    },

    onError: (e: unknown) => {

      const err = e as { response?: { data?: { message?: string; details?: string[] } } };

      const details = err?.response?.data?.details;

      toast({

        title: 'Cannot submit',

        description: Array.isArray(details) ? details.join(', ') : err?.response?.data?.message,

        variant: 'destructive',

      });

    },

  });



  const deleteMutation = useMutation({

    mutationFn: partnerSupplierCatalogApi.deleteProduct,

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['partner-supplier-products'] });

    },

  });



  const workflow = workflowData?.workflow;

  const products = data?.products ?? [];

  const catalogStage = workflow?.stages?.catalog_setup;

  const submitted = !!catalogStage?.submittedForReview;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['partner-supplier-products'] });



  if (workflowLoading || !workflow) {

    return <p className="text-sm text-muted-foreground py-16 text-center">Loading…</p>;

  }



  const editable = workflow.currentStage === 'catalog_setup' || catalogStage?.status === 'blocked';



  return (

    <SupplierOnboardingStageShell stage="catalog_setup" workflow={workflow} showStepNav={false}>

      <Button variant="ghost" size="sm" className="-mt-2 mb-1 w-fit h-8 text-muted-foreground" asChild>

        <Link to="/partner/onboarding/supplier/$stage" params={{ stage: 'catalog_setup' }}>

          <ArrowLeft className="h-4 w-4 mr-1.5" />

          Back to catalog step

        </Link>

      </Button>



      <SupplierCatalogSection

        products={products}

        isLoading={isLoading}

        submitted={submitted}

        editable={editable}

        variant="full"

        onRefresh={refresh}

        onDelete={(id) => deleteMutation.mutate(id)}

        onSubmit={editable && !submitted ? () => submitMutation.mutate() : undefined}

        submitPending={submitMutation.isPending}

      />

    </SupplierOnboardingStageShell>

  );

}


