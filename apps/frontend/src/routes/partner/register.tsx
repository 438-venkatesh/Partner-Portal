import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Individual field schemas for inline validation
const fieldSchemas = {
  partnerName: z.string().min(1, 'Company name is required').max(255, 'Company name must be less than 255 characters'),
  displayName: z.string().max(255, 'Display name must be less than 255 characters').optional().or(z.literal('')),
  partnerType: z.enum(['agency', 'reseller', 'integrator', 'consultant', 'affiliate', 'supplier', 'logistics_partner', 'supplier_logistics'], {
    required_error: 'Partner type is required',
    invalid_type_error: 'Please select a valid partner type',
  }),
  businessType: z.enum(['b2b', 'b2c', 'both']).optional(),
  website: z.string()
    .optional()
    .or(z.literal(''))
    .transform((val) => val === '' ? undefined : val)
    .refine((val) => val === undefined || z.string().url().safeParse(val).success, {
      message: 'Please enter a valid URL (e.g., https://example.com)',
    }),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address (e.g., user@example.com)'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: z.string().max(100, 'First name must be less than 100 characters').optional(),
  lastName: z.string().max(100, 'Last name must be less than 100 characters').optional(),
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
};

// Full schema for final validation
const registerSchema = z.object({
  partnerName: fieldSchemas.partnerName,
  displayName: fieldSchemas.displayName,
  partnerType: fieldSchemas.partnerType,
  businessType: fieldSchemas.businessType,
  website: fieldSchemas.website,
  description: fieldSchemas.description,
  email: fieldSchemas.email,
  password: fieldSchemas.password,
  confirmPassword: fieldSchemas.confirmPassword,
  firstName: fieldSchemas.firstName,
  lastName: fieldSchemas.lastName,
  phone: fieldSchemas.phone,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const steps = [
  { id: 1, title: 'Company Info', description: 'Basic company information' },
  { id: 2, title: 'Partner Details', description: 'Partner type and business details' },
  { id: 3, title: 'Admin Account', description: 'Create administrator account' },
  { id: 4, title: 'Review', description: 'Review and submit' },
];

export const Route = createFileRoute('/partner/register')({
  component: PartnerRegisterPage,
});

function PartnerRegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  // Local state to track form values (workaround for form state sync issue)
  const [partnerTypeLocal, setPartnerTypeLocal] = useState<string | undefined>(undefined);
  const [emailLocal, setEmailLocal] = useState<string>('');
  const [passwordLocal, setPasswordLocal] = useState<string>('');
  const [confirmPasswordLocal, setConfirmPasswordLocal] = useState<string>('');

  const registerMutation = useMutation({
    mutationFn: partnerAuthApi.register,
    onSuccess: (data) => {
      toast({
        title: 'Registration successful',
        description: data.emailVerificationToken
          ? 'Verify your email to activate your account. Redirecting…'
          : 'Check your email for a verification link, then sign in.',
      });
      if (data.emailVerificationToken) {
        navigate({
          to: '/partner/verify-email',
          search: { token: data.emailVerificationToken },
        });
      } else {
        navigate({ to: '/partner/login' });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const form = useForm({
    defaultValues: {
      partnerName: '',
      displayName: '',
      partnerType: undefined as 'agency' | 'reseller' | 'integrator' | 'consultant' | 'affiliate' | 'supplier' | 'logistics_partner' | 'supplier_logistics' | undefined,
      businessType: undefined as 'b2b' | 'b2c' | 'both' | undefined,
      website: '',
      description: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
    onSubmit: async ({ value }) => {
      // Final validation with full schema
      const result = registerSchema.safeParse(value);
      if (!result.success) {
        // Field errors will be shown by validators
        throw new Error(result.error.errors[0]?.message || 'Please fix the validation errors');
      }
      
      const { confirmPassword, ...registerData } = value;
      
      // Clean up empty strings for optional fields - convert to undefined
      const cleanedData = {
        ...registerData,
        website: registerData.website && registerData.website.trim() !== '' ? registerData.website : undefined,
        displayName: registerData.displayName && registerData.displayName.trim() !== '' ? registerData.displayName : undefined,
        description: registerData.description && registerData.description.trim() !== '' ? registerData.description : undefined,
        firstName: registerData.firstName && registerData.firstName.trim() !== '' ? registerData.firstName : undefined,
        lastName: registerData.lastName && registerData.lastName.trim() !== '' ? registerData.lastName : undefined,
        phone: registerData.phone && registerData.phone.trim() !== '' ? registerData.phone : undefined,
        businessType: registerData.businessType || undefined,
      };
      
      await registerMutation.mutateAsync(cleanedData as any);
    },
  });

  // Helper function to create Zod validator
  const createValidator = <T extends z.ZodTypeAny>(schema: T) => {
    return ({ value }: { value: unknown }) => {
      const result = schema.safeParse(value);
      if (result.success) {
        return undefined;
      }
      return result.error.errors[0]?.message || 'Invalid value';
    };
  };

  // Validate step using Zod schemas
  const validateStep = async (step: number): Promise<boolean> => {
    // Force form to sync state first
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get fresh values after sync
    const values = form.state.values;
    let isValid = true;
    const errors: string[] = [];

    try {
      switch (step) {
        case 1:
          const step1Schema = z.object({
            partnerName: fieldSchemas.partnerName,
          });
          const step1Result = step1Schema.safeParse({ partnerName: values.partnerName });
          if (!step1Result.success) {
            isValid = false;
            errors.push(...step1Result.error.errors.map(e => e.message));
            // Field errors will be set by validators automatically
          }
          break;

        case 2:
          // Validate step 2 fields using Zod schema
          const step2Schema = z.object({
            partnerType: fieldSchemas.partnerType,
            businessType: fieldSchemas.businessType,
          });
          
          // Get current values from form state - force a fresh read
          const partnerTypeValue = form.state.values.partnerType;
          const businessTypeValue = form.state.values.businessType;
          
          // Also check field state directly as fallback
          const partnerTypeField = form.getFieldInfo('partnerType');
          const partnerTypeFromField = partnerTypeField?.state?.value;
          // Use local state as final fallback
          const finalPartnerType = partnerTypeLocal || partnerTypeFromField || partnerTypeValue;
          
          console.log('Step 2 validation check:', {
            partnerTypeValue,
            partnerTypeFromField,
            finalPartnerType,
            businessTypeValue,
            allFormValues: form.state.values,
          });
          
          const step2Result = step2Schema.safeParse({
            partnerType: finalPartnerType,
            businessType: businessTypeValue,
          });
          
          if (!step2Result.success) {
            isValid = false;
            const errorMessages = step2Result.error.errors.map(e => e.message);
            errors.push(...errorMessages);
            
            // Log for debugging
            console.log('Step 2 validation failed:', {
              partnerTypeValue,
              partnerTypeFromField,
              finalPartnerType,
              businessTypeValue,
              errors: errorMessages,
              allFormValues: form.state.values,
            });
          } else {
            console.log('Step 2 validation passed:', {
              partnerTypeValue,
              partnerTypeFromField,
              finalPartnerType,
              businessTypeValue,
            });
          }
          break;

        case 3:
          const step3Schema = z.object({
            email: fieldSchemas.email,
            password: fieldSchemas.password,
            confirmPassword: fieldSchemas.confirmPassword,
          }).refine((data) => data.password === data.confirmPassword, {
            message: "Passwords don't match",
            path: ['confirmPassword'],
          });
          // Get current values from form state - use local state as fallback
          const emailValue = emailLocal || form.state.values.email;
          const passwordValue = passwordLocal || form.state.values.password;
          const confirmPasswordValue = confirmPasswordLocal || form.state.values.confirmPassword;
          
          console.log('Step 3 validation check:', {
            emailValue,
            passwordValue,
            confirmPasswordValue,
            emailLocal,
            passwordLocal,
            confirmPasswordLocal,
            formEmail: form.state.values.email,
            formPassword: form.state.values.password,
            allFormValues: form.state.values,
          });
          
          const step3Result = step3Schema.safeParse({
            email: emailValue,
            password: passwordValue,
            confirmPassword: confirmPasswordValue,
          });
          if (!step3Result.success) {
            isValid = false;
            errors.push(...step3Result.error.errors.map(e => e.message));
            // Field errors will be set by validators automatically
            console.log('Step 3 validation failed:', {
              emailValue,
              passwordValue,
              confirmPasswordValue,
              errors: step3Result.error.errors.map(e => e.message),
            });
          } else {
            console.log('Step 3 validation passed:', {
              emailValue,
              passwordValue,
              confirmPasswordValue,
            });
          }
          break;

        default:
          isValid = true;
      }

      if (!isValid && errors.length > 0) {
        toast({
          title: 'Validation Error',
          description: errors[0] || 'Please fix the errors before proceeding.',
          variant: 'destructive',
        });
      }

      return isValid;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // Use validateStep for all steps - it handles validation consistently
      const isValid = await validateStep(currentStep);
      if (isValid) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    form.handleSubmit();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Company Information</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tell us about your organization
              </p>
            </div>

            <form.Field
              name="partnerName"
              validators={{
                onChange: createValidator(fieldSchemas.partnerName),
                onBlur: createValidator(fieldSchemas.partnerName),
              }}
            >
              {(field) => (
                <FormInput
                  label="Company Name"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    field.validate('change');
                  }}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="Enter your company name"
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="displayName"
              validators={{
                onChange: createValidator(fieldSchemas.displayName),
              }}
            >
              {(field) => (
                <FormInput
                  label="Display Name (Optional)"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    field.validate('change');
                  }}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="How your company will be displayed"
                />
              )}
            </form.Field>

            <form.Field
              name="website"
              validators={{
                onChange: createValidator(fieldSchemas.website),
                onBlur: createValidator(fieldSchemas.website),
              }}
            >
              {(field) => (
                <FormInput
                  label="Website (Optional)"
                  type="url"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    if (e.target.value) {
                      field.validate('change');
                    }
                  }}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="https://example.com"
                />
              )}
            </form.Field>

            <form.Field
              name="description"
              validators={{
                onChange: createValidator(fieldSchemas.description),
              }}
            >
              {(field) => (
                <FormTextarea
                  label="Description (Optional)"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    field.validate('change');
                  }}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="Brief description of your company"
                  rows={4}
                />
              )}
            </form.Field>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Partner Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select your partner type and business model
              </p>
            </div>

            <form.Field
              name="partnerType"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value === '') {
                    return 'Partner type is required';
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (!value || value === '') {
                    return 'Partner type is required';
                  }
                  return undefined;
                },
              }}
            >
              {(field) => {
                // Ensure Select is always controlled - use undefined when empty, string when selected
                const selectValue = field.state.value || undefined;
                
                return (
                  <FormField
                    label="Partner Type"
                    required
                    error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  >
                    <Select
                      value={partnerTypeLocal || selectValue || undefined}
                      onValueChange={(value) => {
                        console.log('Partner type selected:', value, 'Current field value:', field.state.value);
                        // Update local state immediately
                        setPartnerTypeLocal(value);
                        // Update form state using both methods to ensure it's synced
                        field.handleChange(value as any);
                        // Also update via form.setFieldValue to ensure state is synced
                        form.setFieldValue('partnerType', value as any);
                        // Validate immediately to clear any errors
                        setTimeout(() => {
                          field.validate('change');
                        }, 10);
                      }}
                      onOpenChange={(open) => {
                        // Validate on blur (when dropdown closes)
                        if (!open) {
                          setTimeout(() => {
                            field.validate('blur');
                          }, 10);
                        }
                      }}
                    >
                      <SelectTrigger className={field.state.meta.errors[0] ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select partner type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agency">Agency</SelectItem>
                        <SelectItem value="reseller">Reseller</SelectItem>
                        <SelectItem value="integrator">Integrator</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="logistics_partner">Logistics Partner</SelectItem>
                        <SelectItem value="supplier_logistics">Supplier + Logistics</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                );
              }}
            </form.Field>

            <form.Field
              name="businessType"
              validators={{
                onChange: createValidator(fieldSchemas.businessType),
              }}
            >
              {(field) => (
                <FormField
                  label="Business Type (Optional)"
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                >
                  <Select
                    value={field.state.value || undefined}
                    onValueChange={(value) => {
                      field.handleChange(value as any);
                      field.validate('change');
                    }}
                  >
                    <SelectTrigger className={field.state.meta.errors[0] ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="b2b">B2B</SelectItem>
                      <SelectItem value="b2c">B2C</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Admin Account</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create the primary administrator account for your organization
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="firstName"
                validators={{
                  onChange: createValidator(fieldSchemas.firstName),
                }}
              >
                {(field) => (
                  <FormInput
                    label="First Name (Optional)"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      field.validate('change');
                    }}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                    placeholder="John"
                  />
                )}
              </form.Field>

              <form.Field
                name="lastName"
                validators={{
                  onChange: createValidator(fieldSchemas.lastName),
                }}
              >
                {(field) => (
                  <FormInput
                    label="Last Name (Optional)"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      field.validate('change');
                    }}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                    placeholder="Doe"
                  />
                )}
              </form.Field>
            </div>

            <form.Field
              name="email"
              validators={{
                onChange: createValidator(fieldSchemas.email),
                onBlur: createValidator(fieldSchemas.email),
              }}
            >
              {(field) => (
                <FormInput
                  label="Email"
                  type="email"
                  value={emailLocal || field.state.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEmailLocal(value);
                    field.handleChange(value);
                    form.setFieldValue('email', value);
                    setTimeout(() => {
                      field.validate('change');
                    }, 10);
                  }}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="admin@company.com"
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="phone"
              validators={{
                onChange: createValidator(fieldSchemas.phone),
              }}
            >
              {(field) => (
                <FormInput
                  label="Phone (Optional)"
                  type="tel"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    field.validate('change');
                  }}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="+1 (555) 123-4567"
                />
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: createValidator(fieldSchemas.password),
                onBlur: createValidator(fieldSchemas.password),
              }}
            >
              {(field) => (
                <FormInput
                  label="Password"
                  type="password"
                  value={passwordLocal || field.state.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPasswordLocal(value);
                    field.handleChange(value);
                    form.setFieldValue('password', value);
                    setTimeout(() => {
                      field.validate('change');
                      // Also validate confirmPassword if it has a value
                      const confirmField = form.getFieldInfo('confirmPassword');
                      if (confirmField && (confirmField.state?.value || confirmPasswordLocal)) {
                        confirmField.validate('change');
                      }
                    }, 10);
                  }}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="At least 8 characters with uppercase, lowercase, and number"
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="confirmPassword"
              validators={{
                onChange: ({ value }) => {
                  const password = form.state.values.password;
                  if (!value) {
                    return 'Please confirm your password';
                  }
                  if (value !== password) {
                    return "Passwords don't match";
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  const password = form.state.values.password;
                  if (!value) {
                    return 'Please confirm your password';
                  }
                  if (value !== password) {
                    return "Passwords don't match";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <FormInput
                  label="Confirm Password"
                  type="password"
                  value={confirmPasswordLocal || field.state.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    setConfirmPasswordLocal(value);
                    field.handleChange(value);
                    form.setFieldValue('confirmPassword', value);
                    setTimeout(() => {
                      field.validate('change');
                    }, 10);
                  }}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="Re-enter your password"
                  required
                />
              )}
            </form.Field>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please review all information before submitting
              </p>
            </div>

            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Company Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company Name:</span>
                    <span className="font-medium">{form.state.values.partnerName}</span>
                  </div>
                  {form.state.values.displayName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Display Name:</span>
                      <span className="font-medium">{form.state.values.displayName}</span>
                    </div>
                  )}
                  {form.state.values.website && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Website:</span>
                      <span className="font-medium">{form.state.values.website}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Partner Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Partner Type:</span>
                    <span className="font-medium capitalize">{form.state.values.partnerType?.replace('_', ' ')}</span>
                  </div>
                  {form.state.values.businessType && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business Type:</span>
                      <span className="font-medium uppercase">{form.state.values.businessType}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Admin Account</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{form.state.values.email}</span>
                  </div>
                  {(form.state.values.firstName || form.state.values.lastName) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">
                        {[form.state.values.firstName, form.state.values.lastName].filter(Boolean).join(' ') || 'N/A'}
                      </span>
                    </div>
                  )}
                  {form.state.values.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{form.state.values.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Partner Registration</CardTitle>
          <CardDescription>
            Register your organization to start providing services to tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stepper */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300',
                        currentStep > step.id
                          ? 'bg-primary border-primary text-primary-foreground'
                          : currentStep === step.id
                          ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20'
                          : 'bg-background border-muted-foreground text-muted-foreground'
                      )}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div
                        className={cn(
                          'text-xs font-medium',
                          currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground hidden sm:block">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2 transition-colors duration-300',
                        currentStep > step.id ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Content */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (currentStep === steps.length) {
                handleSubmit();
              } else {
                handleNext();
              }
            }}
            className="space-y-6"
          >
            <div className="min-h-[400px]">
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                {currentStep === 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: '/partner/login' })}
                  >
                    Already have an account? Login
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {currentStep < steps.length ? (
                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNext();
                    }}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? 'Registering...' : 'Submit Registration'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
