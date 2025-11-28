# Form Examples

> 22+ practical form examples for the Harbor React Library covering validation, submission, and complex form patterns.

## Table of Contents

- [Basic Forms](#basic-forms)
- [Form Validation](#form-validation)
- [Form Submission](#form-submission)
- [Multi-Step Forms](#multi-step-forms)
- [Dynamic Forms](#dynamic-forms)
- [File Uploads](#file-uploads)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

---

## Basic Forms

### Example 1: Simple Form with React Hook Form
**Use Case:** Basic form handling
**Difficulty:** ⭐ Basic

```tsx
import { useForm } from 'react-hook-form';
import { Input, Button, Label } from '@/lib/ui';

interface FormData {
  name: string;
  email: string;
}

function SimpleForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
        />
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

**Explanation:** React Hook Form provides simple form state management and validation.

**See Also:**
- [React Hook Form Docs](https://react-hook-form.com/)
- [Example 2](#example-2-controlled-form)

---

### Example 2: Controlled Form
**Use Case:** Full React state control
**Difficulty:** ⭐ Basic

```tsx
function ControlledForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
        />
      </div>

      <Button type="submit">Create Account</Button>
    </form>
  );
}
```

**Explanation:** Controlled forms give you full control over form state.

---

## Form Validation

### Example 3: Sync Validation with Zod
**Use Case:** Schema-based validation
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const schema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  email: z.string().email('Invalid email address'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  confirmPassword: z.string(),

  age: z.number()
    .min(18, 'You must be at least 18 years old')
    .max(120, 'Invalid age'),

  terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function ValidatedForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log('Valid data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...register('username')} />
        {errors.username && (
          <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && (
          <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          type="number"
          {...register('age', { valueAsNumber: true })}
        />
        {errors.age && (
          <p className="text-red-600 text-sm mt-1">{errors.age.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="terms"
          type="checkbox"
          {...register('terms')}
          className="rounded"
        />
        <Label htmlFor="terms">I accept the terms and conditions</Label>
      </div>
      {errors.terms && (
        <p className="text-red-600 text-sm">{errors.terms.message}</p>
      )}

      <Button type="submit">Register</Button>
    </form>
  );
}
```

**Explanation:** Zod provides type-safe schema validation with excellent error messages.

---

### Example 4: Async Validation
**Use Case:** Check username availability
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { useForm } from 'react-hook-form';
import { debounce } from 'lodash';

function AsyncValidationForm() {
  const { register, handleSubmit, formState: { errors }, setError } = useForm();

  // Check username availability
  const checkUsername = async (username: string): Promise<boolean> => {
    const response = await fetch(`/api/check-username?username=${username}`);
    const { available } = await response.json();
    return available;
  };

  const validateUsername = debounce(async (value: string) => {
    if (value.length < 3) return 'Username must be at least 3 characters';

    const available = await checkUsername(value);
    if (!available) {
      return 'Username is already taken';
    }

    return true;
  }, 500);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          {...register('username', {
            required: 'Username is required',
            validate: validateUsername,
          })}
        />
        {errors.username && (
          <p className="text-red-600 text-sm mt-1">
            {errors.username.message as string}
          </p>
        )}
      </div>

      <Button type="submit">Continue</Button>
    </form>
  );
}
```

**Explanation:** Async validation checks server-side constraints like uniqueness.

---

### Example 5: Field-Level Validation
**Use Case:** Validate on blur
**Difficulty:** ⭐⭐ Intermediate

```tsx
function FieldLevelValidation() {
  const { register, handleSubmit, formState: { errors, touchedFields } } = useForm({
    mode: 'onBlur', // Validate on blur
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email',
            },
          })}
          aria-invalid={touchedFields.email && !!errors.email}
        />
        {touchedFields.email && errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

**Explanation:** Field-level validation provides immediate feedback after user interaction.

---

## Form Submission

### Example 6: Form Submission with Loading State
**Use Case:** Handle async submission
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { useMutation } from '@tanstack/react-query';

function SubmissionForm() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const mutation = useMutation({
    mutationFn: (data: FormData) => fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Form submitted successfully');
      reset();
    },
    onError: (error) => {
      toast.error('Submission failed');
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name', { required: true })} />
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" {...register('message', { required: true })} />
      </div>

      <Button
        type="submit"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <>
            <Spinner className="mr-2" />
            Submitting...
          </>
        ) : (
          'Submit'
        )}
      </Button>

      {mutation.isError && (
        <p className="text-red-600 text-sm">
          {mutation.error.message}
        </p>
      )}
    </form>
  );
}
```

**Explanation:** Handle loading, success, and error states during form submission.

---

### Example 7: Optimistic Updates
**Use Case:** Update UI before server confirms
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { useQueryClient, useMutation } from '@tanstack/react-query';

function OptimisticForm({ itemId }: { itemId: string }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm();

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then((r) => r.json()),

    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['item', itemId] });

      // Snapshot previous value
      const previousItem = queryClient.getQueryData(['item', itemId]);

      // Optimistically update
      queryClient.setQueryData(['item', itemId], (old: any) => ({
        ...old,
        ...newData,
      }));

      return { previousItem };
    },

    // Rollback on error
    onError: (err, newData, context) => {
      queryClient.setQueryData(['item', itemId], context?.previousItem);
      toast.error('Update failed');
    },

    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['item', itemId] });
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <Input {...register('title')} />
      <Button type="submit">Save</Button>
    </form>
  );
}
```

**Explanation:** Optimistic updates improve perceived performance.

---

## Multi-Step Forms

### Example 8: Wizard Form
**Use Case:** Multi-step registration
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function RegistrationWizard() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1
    email: '',
    password: '',
    // Step 2
    firstName: '',
    lastName: '',
    // Step 3
    address: '',
    city: '',
    country: '',
  });

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleFinalSubmit = async () => {
    await api.register(formData);
    toast.success('Registration complete!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className={step >= 1 ? 'text-primary' : 'text-gray-400'}>
            Account
          </span>
          <span className={step >= 2 ? 'text-primary' : 'text-gray-400'}>
            Profile
          </span>
          <span className={step >= 3 ? 'text-primary' : 'text-gray-400'}>
            Address
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded">
          <div
            className="h-full bg-primary rounded transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      {step === 1 && (
        <AccountStep
          data={formData}
          onUpdate={updateFormData}
          onNext={nextStep}
        />
      )}

      {step === 2 && (
        <ProfileStep
          data={formData}
          onUpdate={updateFormData}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 3 && (
        <AddressStep
          data={formData}
          onUpdate={updateFormData}
          onBack={prevStep}
          onSubmit={handleFinalSubmit}
        />
      )}
    </div>
  );
}

function AccountStep({ data, onUpdate, onNext }: StepProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: data,
  });

  const onSubmit = (formData: any) => {
    onUpdate(formData);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Min 8 characters' },
          })}
        />
        {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
      </div>

      <Button type="submit" className="w-full">
        Next
      </Button>
    </form>
  );
}
```

**Explanation:** Multi-step forms break complex forms into manageable sections.

---

### Example 9: Persistent Form State
**Use Case:** Save draft across sessions
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { useEffect } from 'react';

function PersistentForm() {
  const STORAGE_KEY = 'form-draft';

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    },
  });

  // Watch all fields
  const formData = watch();

  // Save to localStorage on change
  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = async (data: FormData) => {
    await api.submit(data);
    localStorage.removeItem(STORAGE_KEY);
    reset();
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    reset({});
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} />
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" {...register('content')} rows={6} />
      </div>

      <div className="flex gap-2">
        <Button type="submit">Submit</Button>
        <Button type="button" variant="secondary" onClick={clearDraft}>
          Clear Draft
        </Button>
      </div>

      {Object.keys(formData).length > 0 && (
        <p className="text-sm text-gray-600">
          Draft saved automatically
        </p>
      )}
    </form>
  );
}
```

**Explanation:** Persistent forms auto-save progress to prevent data loss.

---

## Dynamic Forms

### Example 10: Dynamic Field Arrays
**Use Case:** Add/remove fields dynamically
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { useFieldArray } from 'react-hook-form';

function DynamicFieldsForm() {
  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      contacts: [{ name: '', email: '', phone: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contacts',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {fields.map((field, index) => (
        <div key={field.id} className="border p-4 rounded space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Contact {index + 1}</h3>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            )}
          </div>

          <div>
            <Label htmlFor={`contacts.${index}.name`}>Name</Label>
            <Input
              id={`contacts.${index}.name`}
              {...register(`contacts.${index}.name`, { required: true })}
            />
          </div>

          <div>
            <Label htmlFor={`contacts.${index}.email`}>Email</Label>
            <Input
              id={`contacts.${index}.email`}
              type="email"
              {...register(`contacts.${index}.email`, { required: true })}
            />
          </div>

          <div>
            <Label htmlFor={`contacts.${index}.phone`}>Phone</Label>
            <Input
              id={`contacts.${index}.phone`}
              {...register(`contacts.${index}.phone`)}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => append({ name: '', email: '', phone: '' })}
      >
        <PlusIcon className="mr-2" />
        Add Contact
      </Button>

      <Button type="submit" className="w-full">
        Submit
      </Button>
    </form>
  );
}
```

**Explanation:** Field arrays allow dynamic addition/removal of form sections.

---

### Example 11: Conditional Fields
**Use Case:** Show fields based on selections
**Difficulty:** ⭐⭐ Intermediate

```tsx
function ConditionalFieldsForm() {
  const { register, watch, handleSubmit } = useForm();

  const accountType = watch('accountType');
  const hasCompany = watch('hasCompany');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="accountType">Account Type</Label>
        <select id="accountType" {...register('accountType')} className="w-full">
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Show only for business accounts */}
      {accountType === 'business' && (
        <>
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              {...register('companyName', { required: true })}
            />
          </div>

          <div>
            <Label htmlFor="taxId">Tax ID</Label>
            <Input id="taxId" {...register('taxId', { required: true })} />
          </div>
        </>
      )}

      <div className="flex items-center space-x-2">
        <input
          id="hasCompany"
          type="checkbox"
          {...register('hasCompany')}
          className="rounded"
        />
        <Label htmlFor="hasCompany">I have a company</Label>
      </div>

      {/* Show only if checked */}
      {hasCompany && (
        <div>
          <Label htmlFor="companyWebsite">Company Website</Label>
          <Input id="companyWebsite" {...register('companyWebsite')} />
        </div>
      )}

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

**Explanation:** Conditional fields adapt form based on user selections.

---

## File Uploads

### Example 12: Single File Upload
**Use Case:** Upload profile picture
**Difficulty:** ⭐⭐ Intermediate

```tsx
function FileUploadForm() {
  const { register, handleSubmit, watch } = useForm();
  const [preview, setPreview] = useState<string | null>(null);

  const file = watch('avatar');

  useEffect(() => {
    if (file && file[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file[0]);
    }
  }, [file]);

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    formData.append('avatar', data.avatar[0]);

    await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="avatar">Profile Picture</Label>
        <Input
          id="avatar"
          type="file"
          accept="image/*"
          {...register('avatar', { required: true })}
        />
      </div>

      {preview && (
        <div className="mt-4">
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 rounded-full object-cover"
          />
        </div>
      )}

      <Button type="submit">Upload</Button>
    </form>
  );
}
```

**Explanation:** Handle file selection, preview, and upload.

---

### Example 13: Multiple File Upload with Progress
**Use Case:** Upload multiple documents
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function MultiFileUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: progress,
        }));
      }
    });

    return new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => resolve(xhr.response));
      xhr.addEventListener('error', reject);
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    await Promise.all(files.map((file) => uploadFile(file)));
    toast.success('All files uploaded!');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="files">Select Files</Label>
        <Input
          id="files"
          type="file"
          multiple
          onChange={handleFileChange}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.name} className="border p-3 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-sm text-gray-600">
                  {(file.size / 1024).toFixed(2)} KB
                </span>
              </div>
              {uploadProgress[file.name] !== undefined && (
                <Progress value={uploadProgress[file.name]} />
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={files.length === 0}
      >
        Upload All
      </Button>
    </div>
  );
}
```

**Explanation:** Track upload progress for multiple files.

---

## Advanced Patterns

### Example 14: Form with Auto-Save
**Use Case:** Automatically save form changes
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { useMutation } from '@tanstack/react-query';
import { useDebounce } from '@/lib/hooks';

function AutoSaveForm({ documentId }: { documentId: string }) {
  const { register, watch } = useForm();

  const formData = watch();
  const debouncedData = useDebounce(formData, 1000);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then((r) => r.json()),
  });

  useEffect(() => {
    if (Object.keys(debouncedData).length > 0) {
      saveMutation.mutate(debouncedData);
    }
  }, [debouncedData]);

  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} />
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" {...register('content')} rows={10} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saveMutation.isPending && (
            <>
              <Spinner size="sm" />
              <span className="text-sm text-gray-600">Saving...</span>
            </>
          )}
          {saveMutation.isSuccess && (
            <span className="text-sm text-green-600">Saved</span>
          )}
          {saveMutation.isError && (
            <span className="text-sm text-red-600">Save failed</span>
          )}
        </div>
      </div>
    </form>
  );
}
```

**Explanation:** Auto-save debounces changes and saves automatically.

---

### Example 15: Form with Search/Autocomplete
**Use Case:** Searchable select with API
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

function SearchableSelect() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () =>
      fetch(`/api/search?q=${debouncedSearch}`).then((r) => r.json()),
    enabled: debouncedSearch.length > 2,
  });

  return (
    <div className="relative">
      <Label htmlFor="user-search">Search User</Label>
      <Input
        id="user-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Type to search..."
      />

      {isLoading && (
        <div className="absolute top-full mt-1 w-full bg-white border rounded p-2">
          <Spinner size="sm" />
        </div>
      )}

      {results && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto">
          {results.map((result: any) => (
            <button
              key={result.id}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                setSearch(result.name);
                // Handle selection
              }}
            >
              {result.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Explanation:** Searchable selects query API as user types.

---

### Example 16: Form with Dependent Fields
**Use Case:** Fields that depend on other field values
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function DependentFieldsForm() {
  const { register, watch, setValue } = useForm();

  const country = watch('country');
  const state = watch('state');

  // Fetch states when country changes
  const { data: states } = useQuery({
    queryKey: ['states', country],
    queryFn: () => fetch(`/api/states?country=${country}`).then((r) => r.json()),
    enabled: !!country,
  });

  // Fetch cities when state changes
  const { data: cities } = useQuery({
    queryKey: ['cities', state],
    queryFn: () => fetch(`/api/cities?state=${state}`).then((r) => r.json()),
    enabled: !!state,
  });

  // Reset dependent fields when parent changes
  useEffect(() => {
    setValue('state', '');
    setValue('city', '');
  }, [country]);

  useEffect(() => {
    setValue('city', '');
  }, [state]);

  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="country">Country</Label>
        <select id="country" {...register('country')} className="w-full">
          <option value="">Select country</option>
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
        </select>
      </div>

      {country && (
        <div>
          <Label htmlFor="state">State/Province</Label>
          <select
            id="state"
            {...register('state')}
            className="w-full"
            disabled={!states}
          >
            <option value="">Select state</option>
            {states?.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {state && (
        <div>
          <Label htmlFor="city">City</Label>
          <select
            id="city"
            {...register('city')}
            className="w-full"
            disabled={!cities}
          >
            <option value="">Select city</option>
            {cities?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

**Explanation:** Cascade selections based on API data.

---

### Example 17: Form Schema Generator
**Use Case:** Generate forms from JSON schema
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
interface FieldSchema {
  name: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select';
  label: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: any;
}

function DynamicFormGenerator({ schema }: { schema: FieldSchema[] }) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const renderField = (field: FieldSchema) => {
    const commonProps = {
      id: field.name,
      ...register(field.name, {
        required: field.required ? `${field.label} is required` : false,
        ...field.validation,
      }),
    };

    switch (field.type) {
      case 'textarea':
        return <Textarea {...commonProps} />;

      case 'select':
        return (
          <select {...commonProps} className="w-full">
            <option value="">Select {field.label}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return <Input type={field.type} {...commonProps} />;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {schema.map((field) => (
        <div key={field.name}>
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-red-600 ml-1">*</span>}
          </Label>
          {renderField(field)}
          {errors[field.name] && (
            <p className="text-red-600 text-sm mt-1">
              {errors[field.name]?.message as string}
            </p>
          )}
        </div>
      ))}

      <Button type="submit">Submit</Button>
    </form>
  );
}

// Usage
const formSchema: FieldSchema[] = [
  { name: 'name', type: 'text', label: 'Full Name', required: true },
  { name: 'email', type: 'email', label: 'Email', required: true },
  {
    name: 'role',
    type: 'select',
    label: 'Role',
    required: true,
    options: [
      { value: 'user', label: 'User' },
      { value: 'admin', label: 'Admin' },
    ],
  },
  { name: 'bio', type: 'textarea', label: 'Bio' },
];

<DynamicFormGenerator schema={formSchema} />;
```

**Explanation:** Generate forms dynamically from configuration.

---

### Example 18: Rich Text Editor Form
**Use Case:** WYSIWYG editor in form
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { Controller } from 'react-hook-form';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function RichTextForm() {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Controller
          name="title"
          control={control}
          rules={{ required: 'Title is required' }}
          render={({ field }) => <Input {...field} id="title" />}
        />
      </div>

      <div>
        <Label>Content</Label>
        <Controller
          name="content"
          control={control}
          rules={{ required: 'Content is required' }}
          render={({ field }) => (
            <ReactQuill
              theme="snow"
              value={field.value}
              onChange={field.onChange}
              modules={{
                toolbar: [
                  ['bold', 'italic', 'underline', 'strike'],
                  ['blockquote', 'code-block'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['link', 'image'],
                  ['clean'],
                ],
              }}
            />
          )}
        />
      </div>

      <Button type="submit">Publish</Button>
    </form>
  );
}
```

**Explanation:** Integrate WYSIWYG editors with form validation.

---

### Example 19: Form with Inline Editing
**Use Case:** Edit fields in place
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function InlineEditableField({ value, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = async () => {
    await onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span>{value}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
        >
          <EditIcon />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
      />
      <Button size="sm" onClick={handleSave}>
        <CheckIcon />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleCancel}>
        <XIcon />
      </Button>
    </div>
  );
}
```

**Explanation:** Inline editing provides quick updates without full forms.

---

### Example 20: Form with Drag and Drop Reordering
**Use Case:** Reorder form items
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useFieldArray } from 'react-hook-form';

function ReorderableForm() {
  const { control, register } = useForm({
    defaultValues: {
      items: [
        { id: '1', text: 'Item 1' },
        { id: '2', text: 'Item 2' },
        { id: '3', text: 'Item 3' },
      ],
    },
  });

  const { fields, move } = useFieldArray({
    control,
    name: 'items',
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    move(result.source.index, result.destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="items">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {fields.map((field, index) => (
              <Draggable key={field.id} draggableId={field.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="border p-4 mb-2 bg-white rounded"
                  >
                    <div className="flex items-center gap-2">
                      <DragIcon className="text-gray-400" />
                      <Input {...register(`items.${index}.text`)} />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

**Explanation:** Allow users to reorder form elements via drag and drop.

---

### Example 21: Form with Custom Validation Messages
**Use Case:** Localized or custom error messages
**Difficulty:** ⭐⭐ Intermediate

```tsx
const validationMessages = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  pattern: (field: string) => `Invalid ${field.toLowerCase()} format`,
};

function CustomMessagesForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          {...register('username', {
            required: validationMessages.required('Username'),
            minLength: {
              value: 3,
              message: validationMessages.minLength('Username', 3),
            },
          })}
        />
        {errors.username && (
          <p className="text-red-600 text-sm mt-1">
            {errors.username.message}
          </p>
        )}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

**Explanation:** Centralize validation messages for consistency and i18n.

---

### Example 22: Form with Server-Side Validation
**Use Case:** Handle server validation errors
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function ServerValidationForm() {
  const { register, handleSubmit, setError, formState: { errors } } = useForm();

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errors = await response.json();

        // Set server errors on form fields
        Object.keys(errors).forEach((key) => {
          setError(key as any, {
            type: 'server',
            message: errors[key],
          });
        });

        return;
      }

      toast.success('Form submitted successfully');
    } catch (error) {
      toast.error('Submission failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" {...register('email')} />
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...register('username')} />
        {errors.username && (
          <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>
        )}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

**Explanation:** Merge server-side validation errors into form state.

---

## Best Practices

### Form Design
- ✅ **DO** use clear, descriptive labels
- ✅ **DO** provide helpful error messages
- ✅ **DO** group related fields
- ✅ **DO** indicate required fields
- ❌ **DON'T** use placeholders as labels
- ❌ **DON'T** ask for unnecessary information

### Validation
- ✅ **DO** validate on both client and server
- ✅ **DO** show errors inline near fields
- ✅ **DO** validate progressively (on blur, on submit)
- ✅ **DO** provide real-time feedback for async validation
- ❌ **DON'T** rely solely on client-side validation
- ❌ **DON'T** show errors before user interaction

### Submission
- ✅ **DO** show loading states during submission
- ✅ **DO** prevent double submission
- ✅ **DO** provide clear success feedback
- ✅ **DO** handle errors gracefully
- ❌ **DON'T** lose form data on error
- ❌ **DON'T** submit without user confirmation for destructive actions

### Accessibility
- ✅ **DO** associate labels with inputs
- ✅ **DO** use proper ARIA attributes
- ✅ **DO** ensure keyboard navigation works
- ✅ **DO** provide clear focus states
- ❌ **DON'T** disable form fields without explanation
- ❌ **DON'T** use custom controls without accessibility

---

## Anti-Patterns

### ❌ Missing Labels
```tsx
// BAD
<input placeholder="Enter your name" />

// GOOD
<div>
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="John Doe" />
</div>
```

### ❌ Generic Error Messages
```tsx
// BAD
{errors.email && <p>Invalid input</p>}

// GOOD
{errors.email && <p>{errors.email.message}</p>}
```

### ❌ No Loading State
```tsx
// BAD
<Button type="submit">Submit</Button>

// GOOD
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</Button>
```

---

## See Also

- [React Hook Form Documentation](https://react-hook-form.com/) - Form library docs
- [Zod Documentation](https://zod.dev/) - Schema validation
- [Form Guide](../FORMS.md) - Complete form documentation
- [Accessibility Guide](../ACCESSIBILITY.md) - Form accessibility
- [Documentation Index](../INDEX.md) - All documentation resources
