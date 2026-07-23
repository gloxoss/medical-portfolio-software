# How I Built a Enterprise-Grade Hospital Information System (MediCore) 🚀

Here is a simplified overview of the key concepts and code snippets behind **MediCore HIS** – a secure, multi-tenant system connecting real-time MongoDB data to a modern Next.js Patient Dashboard.

---

## 1. Real-time Patient Filtering (Next.js & React Query)

Instead of using basic strings, the UI utilizes caching and server-side pagination integrated cleanly. This ensures lightning-fast searches through large hospital databases.

```tsx
// frontend search logic
const { data, isLoading } = useQuery({
  queryKey: ['patients', { page: 1, limit: 10, searchQuery }],
  queryFn: () => PatientApi.search({ page: 1, limit: 10, q: searchQuery }),
});

// clean UI mapping
<tbody>
  {data?.map(patient => (
     <tr key={patient.mrn}>
       <td>{patient.mrn}</td>
       <td>{patient.firstName} {patient.lastName}</td>
       <td><Badge>{patient.status}</Badge></td>
     </tr>
  ))}
</tbody>
```

## 2. Advanced Multi-Schema DB Connections (NestJS)

Most apps use 1 database. Medical apps use **many**. We combine **Prisma (PostgreSQL)** for structured transactional data like appointments, and **Mongoose (MongoDB)** for flexible unstructured clinical arrays.

```typescript
// B10-Feature: Extracting Clinical Context seamlessly 
async getPatientContext(orgId: string, patientId: string) {
  // 1. Fetch from Mongo array collections
  const encountersData = await this.encountersService.getPatientEncounters(orgId, patientId, 1, 5);
  
  // 2. Aggregate deeply nested arrays perfectly typed
  const allPrescriptions = encountersData.data.flatMap((enc) => enc.prescriptions ?? []);
  
  // 3. Deduplicate 
  const activeMedicationsMap = new Map();
  for (const rx of allPrescriptions) {
     activeMedicationsMap.set(rx.drug_name, rx);
  }

  // Ready for AI injection or Dashboard display!
  return {
    patient,
    past_encounters: encountersData.data,
    active_medications: Array.from(activeMedicationsMap.values()),
  };
}
```

## 3. Strict Form Schemas in Healthcare
You cannot afford errors when entering a patient's date of birth or emergency contact. We bound standard HTML to strict Zod execution logic perfectly.

```typescript
const formSchema = z.object({
  first_name: z.string().min(2, 'Required'),
  last_name: z.string().min(2, 'Required'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  phone: z.string().min(8, 'Valid phone number required'),
  // Fails compilation natively if mismatched!
});

// inside the component:
<form onSubmit={handleSubmit(onSubmit)}>
   <Label>First Name</Label>
   <Input {...register('first_name')} />
   {errors.first_name && <span className="error">{errors.first_name.message}</span>}
</form>
```

---
*Created as a part of the #BuildInPublic SaaS series! #NextJS #TypeScript #NestJS #Docker*
