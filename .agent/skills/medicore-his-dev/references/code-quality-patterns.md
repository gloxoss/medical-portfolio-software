# MediCore HIS — Code Quality Patterns

> Advanced TypeScript, React, NestJS, and UI patterns that produce clean, maintainable, 
> production-grade code. Load this reference when building any MediCore feature.

---

## 1. Discriminated Unions (State Modeling)

**Never model state with booleans.** Use discriminated unions so TypeScript catches impossible states.

```typescript
// ❌ BAD — Boolean soup. What does isLoading + isError mean?
interface PatientState {
  isLoading: boolean;
  isError: boolean;
  data: Patient[] | null;
  error: Error | null;
}

// ✅ GOOD — Only valid states are representable
type PatientState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Patient[] }
  | { status: 'error'; error: AppError }
  | { status: 'empty' };

// Usage — TypeScript narrows automatically:
function renderPatients(state: PatientState) {
  switch (state.status) {
    case 'idle':    return null;
    case 'loading': return <Skeleton />;
    case 'success': return <PatientTable data={state.data} />;
    //                                         ^^^ TS knows data exists
    case 'error':   return <ErrorState error={state.error} />;
    case 'empty':   return <EmptyState />;
  }
}
```

### Where to Use in MediCore

| Domain | States |
|--------|--------|
| Encounter | `'draft' | 'in_progress' | 'signed_off' | 'amended' | 'void'` |
| Appointment | `'booked' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'no_show' | 'cancelled'` |
| Invoice | `'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'void'` |
| Lab Order | `'pending' | 'collected' | 'in_progress' | 'completed' | 'cancelled'` |
| Prescription | `'prescribed' | 'dispensed' | 'partially_dispensed' | 'returned'` |

---

## 2. Exhaustive Switch (Compile-Time Safety)

Ensure every case is handled — TS errors if you add a new status and forget to handle it:

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${x}`);
}

function getStatusColor(status: EncounterStatus): string {
  switch (status) {
    case 'draft':       return 'var(--status-neutral)';
    case 'in_progress': return 'var(--status-info)';
    case 'signed_off':  return 'var(--status-success)';
    case 'amended':     return 'var(--status-warning)';
    case 'void':        return 'var(--status-danger)';
    default:            return assertNever(status);
    //                         ^^^^^^ TS errors if new status added but not handled
  }
}
```

---

## 3. Result Pattern (No Thrown Errors for Business Logic)

```typescript
// Define once:
type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// Service returns Result instead of throwing:
class PatientService {
  async create(tenant: TenantContext, dto: CreatePatientDto): Promise<Result<{
    patient: Patient;
    warnings: string[];
  }>> {
    // Validation
    const parsed = CreatePatientSchema.safeParse(dto);
    if (!parsed.success) {
      return { ok: false, error: { code: 'VALIDATION', message: parsed.error.message } };
    }

    // Business logic
    const existingPhone = await this.repo.findByPhone(tenant, dto.phone);
    const warnings: string[] = [];
    if (existingPhone) warnings.push('DUPLICATE_PHONE');

    const mrn = await this.generateMrn(tenant);
    const patient = await this.repo.create({ ...dto, mrn, org_id: tenant.orgId });

    return { ok: true, data: { patient, warnings } };
  }
}

// Controller handles the Result:
@Post()
async create(@Body() dto: CreatePatientDto, @TenantScoped() tenant: TenantContext) {
  const result = await this.patientService.create(tenant, dto);
  if (!result.ok) {
    throw new BadRequestException(result.error.message);
  }
  return result.data;
}
```

---

## 4. Compound Components (Complex UI)

For complex UI like the Encounter Workspace, use compound components:

```tsx
// ✅ GOOD — Composable, flexible, each piece testable independently
<EncounterWorkspace encounterId={id}>
  <EncounterWorkspace.Sidebar>
    <PatientSummaryCard />
    <VitalsPanel />
    <AllergyBadges />
  </EncounterWorkspace.Sidebar>
  
  <EncounterWorkspace.Main>
    <SOAPNotes />
    <DiagnosisPicker />
    <PrescriptionWriter />
  </EncounterWorkspace.Main>
  
  <EncounterWorkspace.Actions>
    <OrderLabButton />
    <SignOffButton />
  </EncounterWorkspace.Actions>
</EncounterWorkspace>

// ❌ BAD — Monolithic, 500+ lines, untestable
<EncounterWorkspace
  encounterId={id}
  showVitals={true}
  showSoap={true}
  showDiagnosis={true}
  showPrescription={true}
  onSignOff={handleSignOff}
  onOrderLab={handleOrderLab}
  // ... 20 more props
/>
```

### Implementation Pattern

```tsx
// Create context for shared state
const WorkspaceContext = createContext<WorkspaceState | null>(null);

function EncounterWorkspace({ encounterId, children }: Props) {
  const encounter = useEncounter(encounterId);
  const [activePanel, setActivePanel] = useState<PanelType>('soap');
  
  return (
    <WorkspaceContext.Provider value={{ encounter, activePanel, setActivePanel }}>
      <div className="workspace-layout">
        {children}
      </div>
    </WorkspaceContext.Provider>
  );
}

// Sub-components access context
EncounterWorkspace.Sidebar = function Sidebar({ children }: { children: ReactNode }) {
  return <aside className="workspace-sidebar">{children}</aside>;
};

EncounterWorkspace.Main = function Main({ children }: { children: ReactNode }) {
  return <main className="workspace-main">{children}</main>;
};

// Export as namespace
export { EncounterWorkspace };
```

---

## 5. Custom Hooks — Encapsulate ALL Logic

Components should be dumb. Hooks hold the brains:

```tsx
// ❌ BAD — Logic in component
function AppointmentCalendar() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('week');
  const { data } = useQuery({ ... });
  
  const slots = useMemo(() => {
    // 40 lines of slot calculation logic
  }, [data, date, view]);
  
  const handleBookSlot = async (slot: Slot) => {
    // 20 lines of booking logic
  };
  
  // ... more logic
  
  return <CalendarView slots={slots} onBook={handleBookSlot} />;
}

// ✅ GOOD — Hook encapsulates everything
function AppointmentCalendar() {
  const {
    slots,
    date, setDate,
    view, setView,
    bookSlot,
    isBooking,
    selectedDoctor,
  } = useAppointmentCalendar();
  
  return (
    <CalendarView
      slots={slots}
      date={date}
      view={view}
      onDateChange={setDate}
      onViewChange={setView}
      onBook={bookSlot}
      isBooking={isBooking}
    />
  );
}

// The hook:
function useAppointmentCalendar() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('week');
  const auth = useAuthStore();
  
  const { data: appointments } = useAppointments({
    doctor_id: auth.user?.id,
    date: formatDate(date),
    view,
  });
  
  const slots = useMemo(
    () => calculateSlots(appointments, date, view),
    [appointments, date, view],
  );
  
  const bookMutation = useCreateAppointment();
  
  return {
    slots,
    date, setDate,
    view, setView,
    bookSlot: bookMutation.mutateAsync,
    isBooking: bookMutation.isPending,
    selectedDoctor: auth.user,
  };
}
```

---

## 6. Form Pattern (Controlled + Validation)

All MediCore forms follow this pattern:

```tsx
// 1. Define schema with Zod
const PatientFormSchema = z.object({
  first_name: z.string().min(1, 'Required').max(100),
  last_name: z.string().min(1, 'Required').max(100),
  phone: z.string().regex(/^\+212[0-9]{9}$/, 'Invalid Moroccan phone'),
  date_of_birth: z.string().pipe(z.coerce.date()),
  sex: z.enum(['M', 'F']),
  email: z.string().email().optional().or(z.literal('')),
  allergies: z.array(z.object({
    allergen: z.string().min(1),
    severity: z.enum(['mild', 'moderate', 'severe']),
    reaction: z.string().optional(),
  })).default([]),
});

type PatientFormData = z.infer<typeof PatientFormSchema>;

// 2. Use React Hook Form + Zod resolver
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function PatientForm({ orgPrefix }: { orgPrefix: string }) {
  const form = useForm<PatientFormData>({
    resolver: zodResolver(PatientFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '+212',
      sex: 'M',
      allergies: [],
    },
  });

  const createPatient = useCreatePatient();

  const onSubmit = form.handleSubmit(async (data) => {
    const result = await createPatient.mutateAsync(data);
    if (result.warnings?.includes('DUPLICATE_PHONE')) {
      toast.warning('Another patient has this phone number');
    }
    toast.success(`Patient ${result.mrn} registered`);
    router.push(`/ops/patients/${result.id}`);
  });

  return (
    <form onSubmit={onSubmit}>
      <FormField
        label="First name"
        error={form.formState.errors.first_name?.message}
        {...form.register('first_name')}
      />
      {/* ... */}
      <Button
        type="submit"
        loading={createPatient.isPending}
        disabled={!form.formState.isValid}
      >
        Register Patient
      </Button>
    </form>
  );
}
```

---

## 7. Optimistic Updates (Instant Feedback)

```typescript
// Appointment check-in — update UI instantly, rollback on error
function useCheckInAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (appointmentId: string) =>
      appointmentApi.checkIn(appointmentId),

    // Optimistic update — change status before server responds
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: ['queue'] });
      
      const previousQueue = queryClient.getQueryData(['queue']);
      
      queryClient.setQueryData(['queue'], (old: QueueItem[]) =>
        old.map(item =>
          item.appointment_id === appointmentId
            ? { ...item, status: 'checked_in', checked_in_at: new Date().toISOString() }
            : item
        )
      );
      
      return { previousQueue };
    },
    
    // Rollback on error
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['queue'], context?.previousQueue);
      toast.error('Check-in failed. Please try again.');
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}
```

---

## 8. Loading Skeletons (Not Spinners)

Every data component has a matching skeleton:

```tsx
// ✅ Skeleton matches the real component's layout
function PatientCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="skeleton-line" style={{ width: '60%', height: 20 }} />
      <div className="skeleton-line" style={{ width: '40%', height: 14 }} />
      <div className="skeleton-line" style={{ width: '80%', height: 14 }} />
    </div>
  );
}

// CSS
.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-line {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

---

## 9. Error Boundaries + Retry Pattern

```tsx
// Each route group has its own error boundary
// app/(clinical)/error.tsx
'use client';

export default function ClinicalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring service (not console.log)
    logger.error('Clinical module error', { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="error-state">
      <AlertCircleIcon className="error-icon" />
      <h2>Something went wrong</h2>
      <p>We couldn't load this page. This has been reported automatically.</p>
      <div className="error-actions">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="secondary" onClick={() => router.push('/clinical/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
```

---

## 10. API Response Shapes (Consistent)

Every API response follows ONE of these shapes:

```typescript
// Single item
interface SingleResponse<T> {
  data: T;
  warnings?: string[];  // Soft issues (duplicate phone, etc.)
}

// Paginated list
interface ListResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error
interface ErrorResponse {
  statusCode: number;
  code: string;        // Machine-readable: 'PATIENT_NOT_FOUND'
  message: string;     // Human-readable: 'Patient not found'
  timestamp: string;
}

// No other shapes allowed. Frontend can rely on these contracts.
```

---

## 11. Barrel Exports (Module Boundaries)

```typescript
// modules/patients/index.ts — public API of the module
export { PatientModule } from './patient.module';
export { PatientService } from './patient.service';
export type { Patient } from './entities/patient.entity';
export type { CreatePatientDto, UpdatePatientDto } from './dto';

// Other modules import from the barrel, NEVER from internal files:
// ✅ import { PatientService } from '../patients';
// ❌ import { PatientService } from '../patients/patient.service';
```

---

## 12. State Machines (Multi-Step Flows)

For complex flows like Encounter or Appointment lifecycle:

```typescript
// Encounter state machine — defines valid transitions
const encounterStateMachine = {
  draft: {
    START: 'in_progress',
    VOID: 'void',
  },
  in_progress: {
    SIGN_OFF: 'signed_off',
    VOID: 'void',
  },
  signed_off: {
    AMEND: 'amended',
  },
  amended: {
    SIGN_OFF: 'signed_off',
  },
  void: {
    // Terminal state — no transitions out
  },
} as const;

// Service enforces transitions:
class EncounterService {
  async transition(
    tenant: TenantContext,
    encounterId: string,
    action: EncounterAction,
  ): Promise<Result<Encounter>> {
    const encounter = await this.repo.findById(tenant, encounterId);
    const nextStatus = encounterStateMachine[encounter.status][action];

    if (!nextStatus) {
      return {
        ok: false,
        error: { code: 'INVALID_TRANSITION', message: `Cannot ${action} from ${encounter.status}` },
      };
    }

    return { ok: true, data: await this.repo.updateStatus(encounter.id, nextStatus) };
  }
}
```

---

## 13. CSS Architecture (DESIGN.md Enforcement)

```css
/* ✅ Component CSS uses ONLY design tokens */
.patient-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  transition: var(--transition-fast);
}

.patient-card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* ❌ NEVER: raw values */
.patient-card {
  background: #111113;      /* Use var(--bg-surface) */
  border-radius: 8px;       /* Use var(--radius-md) */
  padding: 16px;            /* Use var(--space-4) */
}
```

### Responsive Pattern

```css
/* Mobile-first, then enhance */
.encounter-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .encounter-layout {
    grid-template-columns: 280px 1fr;
  }
}

@media (min-width: 1280px) {
  .encounter-layout {
    grid-template-columns: 280px 1fr 320px;
  }
}
```

---

## 14. Structured Logging (Not console.log)

```typescript
// ❌ NEVER in production code
console.log('Patient created:', patient);

// ✅ Structured logger with context
import { Logger } from '@nestjs/common';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  async create(tenant: TenantContext, dto: CreatePatientDto) {
    this.logger.log(`Creating patient`, {
      org_id: tenant.orgId,
      facility_id: tenant.facilityId,
    });

    // ... business logic ...

    this.logger.log(`Patient created: ${patient.mrn}`, {
      patient_id: patient.id,
      mrn: patient.mrn,
      org_id: tenant.orgId,
    });
  }
}
```

---

## 15. Performance Patterns

### Virtual Scrolling (Large Lists)

```tsx
// For lists > 100 items, use virtualization
import { useVirtualizer } from '@tanstack/react-virtual';

function PatientList({ patients }: { patients: Patient[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: patients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // row height
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <PatientRow
            key={virtualRow.key}
            patient={patients[virtualRow.index]}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### Debounced Search

```typescript
// Custom hook for debounced values
function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage in search:
function PatientSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  
  const { data } = usePatients({ q: debouncedQuery, page: 1, limit: 20 });
  
  return <SearchInput value={query} onChange={setQuery} />;
}
```
