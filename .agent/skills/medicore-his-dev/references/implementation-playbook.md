# MediCore HIS — Implementation Playbook

> Extended reference loaded on demand. Contains detailed patterns for each module.

---

## 1. Monorepo Structure

```
medicore/
├── apps/
│   ├── web/                    # Next.js 14 (App Router)
│   │   ├── src/
│   │   │   ├── app/            # Routes (App Router)
│   │   │   │   ├── (auth)/     # Auth shell (login, register, onboarding)
│   │   │   │   ├── (admin)/    # Admin shell (org settings, team, analytics)
│   │   │   │   ├── (clinical)/ # Clinical shell (patients, encounters)
│   │   │   │   ├── (ops)/      # Operations shell (queue, billing, appointments)
│   │   │   │   ├── (lab)/      # Lab shell (orders, results)
│   │   │   │   ├── (pharmacy)/ # Pharmacy shell (dispensing, inventory)
│   │   │   │   ├── (portal)/   # Patient portal shell
│   │   │   │   └── (super)/    # Super admin shell
│   │   │   ├── components/     # Shared UI components
│   │   │   │   ├── ui/         # Primitives (Button, Input, Modal, Table)
│   │   │   │   ├── layout/     # Shell, Sidebar, TopBar, Breadcrumb
│   │   │   │   ├── clinical/   # Encounter, Vitals, SOAP, Prescription
│   │   │   │   ├── billing/    # Invoice, Payment, LineItems
│   │   │   │   └── shared/     # ErrorState, EmptyState, Skeleton, StatusBadge
│   │   │   ├── lib/
│   │   │   │   ├── api/        # API client (one file per module)
│   │   │   │   ├── hooks/      # React Query hooks
│   │   │   │   ├── stores/     # Zustand stores (auth, facility, ui)
│   │   │   │   ├── types/      # Shared TypeScript interfaces
│   │   │   │   └── utils/      # Date formatting, MRN parsing, currency
│   │   │   └── styles/
│   │   │       ├── globals.css  # Design tokens import + base styles
│   │   │       └── components/  # Component-specific CSS modules
│   │   ├── public/
│   │   └── next.config.js
│   │
│   ├── api/                    # NestJS API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── patients/
│   │   │   │   ├── appointments/
│   │   │   │   ├── encounters/
│   │   │   │   ├── billing/
│   │   │   │   ├── pharmacy/   # Phase 2
│   │   │   │   ├── lab/        # Phase 2
│   │   │   │   ├── radiology/  # Phase 2
│   │   │   │   ├── ipd/        # Phase 2
│   │   │   │   ├── inventory/  # Phase 2
│   │   │   │   ├── hr/         # Phase 3
│   │   │   │   ├── portal/     # Phase 2
│   │   │   │   └── notifications/
│   │   │   ├── common/
│   │   │   │   ├── guards/     # JwtAuthGuard, RolesGuard, TenantGuard
│   │   │   │   ├── decorators/ # @CurrentUser, @Roles, @TenantScoped
│   │   │   │   ├── filters/    # GlobalExceptionFilter
│   │   │   │   ├── interceptors/ # AuditLogInterceptor, TenantInterceptor
│   │   │   │   ├── pipes/      # ValidationPipe config
│   │   │   │   └── interfaces/ # Shared interfaces
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   ├── seeds/
│   │   │   │   └── entities/   # TypeORM entities
│   │   │   └── config/
│   │   │       ├── database.config.ts
│   │   │       ├── jwt.config.ts
│   │   │       ├── redis.config.ts
│   │   │       └── r2.config.ts
│   │   └── test/
│   │
│   └── ai-sidecar/            # FastAPI (Python)
│       ├── app/
│       │   ├── routers/
│       │   ├── services/
│       │   └── models/
│       └── tests/
│
├── packages/
│   ├── shared-types/           # Shared TS types (used by web + api)
│   │   ├── src/
│   │   │   ├── patient.ts
│   │   │   ├── encounter.ts
│   │   │   ├── appointment.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── eslint-config/          # Shared ESLint config
│
├── docker-compose.yml          # Local dev: PG + Redis + Mongo
├── turbo.json                  # Turborepo config
├── package.json                # Root workspace
└── .env.example                # All required env vars documented
```

---

## 2. Auth Module Pattern

### Backend (NestJS)

```typescript
// modules/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const result = await this.authService.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh',
    });

    return {
      access_token: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('No refresh token');
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(
    @CurrentUser() user: UserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.userId);
    res.clearCookie('refresh_token');
    return { message: 'Logged out' };
  }
}
```

```typescript
// modules/auth/dto/login.dto.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginDto = z.infer<typeof LoginSchema>;
```

### Frontend (Next.js)

```typescript
// lib/api/auth.api.ts
import { apiClient } from './client';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  refresh: () =>
    apiClient.post<{ access_token: string }>('/auth/refresh'),

  logout: () =>
    apiClient.post('/auth/logout'),

  me: () =>
    apiClient.get<UserProfile>('/auth/me'),
};
```

```typescript
// lib/stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  currentFacilityId: string | null;
  setFacility: (id: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      currentFacilityId: null,
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
      setFacility: (id) => set({ currentFacilityId: id }),
    }),
    {
      name: 'medicore-auth',
      partialize: (state) => ({
        currentFacilityId: state.currentFacilityId,
      }), // Only persist facility selection, NOT tokens
    }
  )
);
```

---

## 3. Tenant Scoping Pattern

### TenantInterceptor (applies to all requests)

```typescript
// common/interceptors/tenant.interceptor.ts
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      // Attach tenant context to every request
      request.tenantContext = {
        orgId: user.org_id,
        facilityId: request.headers['x-facility-id'] || user.default_facility_id,
        userId: user.user_id,
        role: user.role,
      };
    }

    return next.handle();
  }
}
```

### @TenantScoped Decorator

```typescript
// common/decorators/tenant-scoped.decorator.ts
export const TenantScoped = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenantContext;
    if (!tenant?.orgId) throw new ForbiddenException('Tenant context required');
    return tenant;
  },
);

// Usage in controller:
@Get()
async findAll(@TenantScoped() tenant: TenantContext) {
  return this.patientService.findAll(tenant);
}
```

### Repository Pattern with Tenant Scoping

```typescript
// modules/patients/patient.repository.ts
@Injectable()
export class PatientRepository {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly repo: Repository<PatientEntity>,
  ) {}

  // EVERY method receives tenant context
  async findAll(tenant: TenantContext, filters: PatientFilters) {
    const qb = this.repo.createQueryBuilder('p')
      .where('p.org_id = :orgId', { orgId: tenant.orgId })
      .andWhere('p.facility_id = :facilityId', { facilityId: tenant.facilityId });

    if (filters.q) {
      qb.andWhere(
        '(p.first_name ILIKE :q OR p.last_name ILIKE :q OR p.mrn ILIKE :q OR p.phone ILIKE :q)',
        { q: `%${filters.q}%` },
      );
    }

    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }

    return qb
      .orderBy('p.created_at', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();
  }

  async findById(tenant: TenantContext, id: string) {
    return this.repo.findOne({
      where: { id, org_id: tenant.orgId },
    });
  }
}
```

---

## 4. API Client Pattern (Frontend)

### Axios Instance with Token Refresh

```typescript
// lib/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // sends httpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token + facility header
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken, currentFacilityId } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (currentFacilityId) {
    config.headers['X-Facility-Id'] = currentFacilityId;
  }

  return config;
});

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: Error) => void;
}> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        useAuthStore.getState().setAuth(
          useAuthStore.getState().user!,
          data.access_token,
        );

        failedQueue.forEach(({ resolve }) => resolve(data.access_token));
        failedQueue = [];

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError as Error));
        failedQueue = [];
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
```

### React Query Hook Pattern

```typescript
// lib/hooks/usePatients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '../api/patient.api';

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: PatientFilters) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

export function usePatients(filters: PatientFilters) {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: () => patientApi.search(filters),
    staleTime: 30_000, // 30s before refetch
    placeholderData: keepPreviousData, // keep old data while loading new page
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patientApi.create,
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      // Optionally pre-populate detail cache
      queryClient.setQueryData(
        patientKeys.detail(newPatient.id),
        newPatient,
      );
    },
  });
}
```

---

## 5. Component Patterns

### Data Table Component

```tsx
// components/ui/DataTable.tsx
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: {
    icon: ReactNode;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
}

export function DataTable<T>({
  columns, data, totalCount, page, pageSize,
  onPageChange, onRowClick, isLoading, emptyState,
}: DataTableProps<T>) {
  if (isLoading) return <TableSkeleton columns={columns.length} rows={pageSize} />;

  if (data.length === 0 && emptyState) {
    return (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
      />
    );
  }

  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((col) => (
                <td key={col.id}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
```

### Status Badge

```tsx
// components/shared/StatusBadge.tsx
const statusConfig: Record<string, { color: string; label: string }> = {
  active:    { color: 'var(--status-success)',  label: 'Active' },
  inactive:  { color: 'var(--status-neutral)',  label: 'Inactive' },
  booked:    { color: 'var(--status-info)',     label: 'Booked' },
  checked_in:{ color: 'var(--status-success)',  label: 'Checked In' },
  completed: { color: 'var(--status-success)',  label: 'Completed' },
  no_show:   { color: 'var(--status-danger)',   label: 'No Show' },
  cancelled: { color: 'var(--status-danger)',   label: 'Cancelled' },
  draft:     { color: 'var(--status-neutral)',  label: 'Draft' },
  sent:      { color: 'var(--status-warning)',  label: 'Sent' },
  paid:      { color: 'var(--status-success)',  label: 'Paid' },
  overdue:   { color: 'var(--status-danger)',   label: 'Overdue' },
  void:      { color: 'var(--status-neutral)',  label: 'Void' },
  pending:   { color: 'var(--status-warning)',  label: 'Pending' },
  dispensed: { color: 'var(--status-success)',  label: 'Dispensed' },
  abnormal:  { color: 'var(--status-danger)',   label: 'Abnormal' },
  normal:    { color: 'var(--status-success)',  label: 'Normal' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    color: 'var(--status-neutral)', label: status
  };

  return (
    <span
      className="status-badge"
      style={{ '--badge-color': config.color } as React.CSSProperties}
    >
      {config.label}
    </span>
  );
}
```

---

## 6. Event-Driven Communication (Redis PubSub)

### Publishing Events

```typescript
// common/events/event-publisher.ts
@Injectable()
export class EventPublisher {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async publish<T>(channel: string, event: DomainEvent<T>) {
    const payload = JSON.stringify({
      id: randomUUID(),
      type: channel,
      timestamp: new Date().toISOString(),
      data: event.data,
      metadata: {
        org_id: event.orgId,
        facility_id: event.facilityId,
        user_id: event.userId,
      },
    });

    await this.redis.publish(channel, payload);
  }
}

// Usage in EncounterService after sign-off:
await this.eventPublisher.publish('encounter.signed_off', {
  data: { encounter_id: encounter.id, patient_id: encounter.patient_id },
  orgId: tenant.orgId,
  facilityId: tenant.facilityId,
  userId: tenant.userId,
});
```

### Subscribing to Events

```typescript
// modules/billing/billing.subscriber.ts
@Injectable()
export class BillingSubscriber implements OnModuleInit {
  constructor(
    @InjectRedis('subscriber') private readonly redis: Redis,
    private readonly billingService: BillingService,
  ) {}

  async onModuleInit() {
    await this.redis.subscribe('encounter.signed_off');
    this.redis.on('message', async (channel, message) => {
      if (channel === 'encounter.signed_off') {
        const event = JSON.parse(message);
        await this.billingService.createInvoiceFromEncounter(
          event.data.encounter_id,
          event.metadata,
        );
      }
    });
  }
}
```

---

## 7. Audit Log Pattern

```typescript
// common/interceptors/audit-log.interceptor.ts
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only log state-changing operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (responseBody) => {
        await this.auditService.log({
          user_id: request.user?.user_id,
          org_id: request.tenantContext?.orgId,
          facility_id: request.tenantContext?.facilityId,
          action: method,
          resource: request.route?.path,
          resource_id: request.params?.id || responseBody?.id,
          ip: request.ip,
          user_agent: request.headers['user-agent'],
          request_body: this.sanitize(request.body),
          response_status: context.switchToHttp().getResponse().statusCode,
          duration_ms: Date.now() - startTime,
        });
      }),
    );
  }

  private sanitize(body: Record<string, unknown>) {
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'credit_card'];
    for (const field of sensitiveFields) {
      if (field in sanitized) sanitized[field] = '[REDACTED]';
    }
    return sanitized;
  }
}
```

---

## 8. Error Handling Pattern

### Global Exception Filter

```typescript
// common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let message = 'An unexpected error occurred';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message = typeof exResponse === 'string'
        ? exResponse
        : (exResponse as any).message || message;
      code = (exResponse as any).code || `HTTP_${status}`;
    }

    // Log full error server-side
    this.logger.error(
      `${code}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Return sanitized error to client
    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Frontend Error Boundary

```tsx
// app/(clinical)/error.tsx
'use client';

export default function ClinicalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong"
      description="We couldn't load this page. Please try again."
      action={{ label: 'Try Again', onClick: reset }}
      reportAction={{
        label: 'Report Issue',
        onClick: () => reportError(error.digest),
      }}
    />
  );
}
```
