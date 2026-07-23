import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PatientsRepository } from './patients.repository';
import { Patient } from './schemas/patient.schema';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

describe('PatientsRepository', () => {
  let repository: PatientsRepository;

  const mockModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPrisma = {
    organization: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsRepository,
        { provide: getModelToken(Patient.name), useValue: mockModel },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PatientsRepository>(PatientsRepository);
  });

  it('findAll/search scopes records to the requested orgId', async () => {
    const findExec = jest.fn().mockResolvedValue([]);
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: findExec,
    };

    const countExec = jest.fn().mockResolvedValue(0);

    mockModel.find.mockReturnValue(findChain);
    mockModel.countDocuments.mockReturnValue({ exec: countExec });

    await repository.search('org-001', undefined, 1, 20);

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: 'org-001', status: 'active' }),
      undefined,
    );
  });

  it('findById returns null when patient is outside org scope', async () => {
    const patientId = new Types.ObjectId().toString();
    const exec = jest.fn().mockResolvedValue(null);

    mockModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({ exec }),
    });

    const result = await repository.findById('org-001', patientId);

    expect(result).toBeNull();
    expect(mockModel.findOne).toHaveBeenCalledWith({ _id: patientId, org_id: 'org-001' });
  });

  it('search with a query string adds $text filter for full-text search', async () => {
    const findExec = jest.fn().mockResolvedValue([]);
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: findExec,
    };
    const countExec = jest.fn().mockResolvedValue(0);
    mockModel.find.mockReturnValue(findChain);
    mockModel.countDocuments.mockReturnValue({ exec: countExec });

    await repository.search('org-001', 'diabetes', 1, 20);

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ $text: { $search: 'diabetes' } }),
      expect.anything(),
    );
  });

  it('findByPhone scopes lookup to orgId', async () => {
    const patient = { _id: 'pat-001', org_id: 'org-001', phone: '+212600000001' };
    const exec = jest.fn().mockResolvedValue(patient);
    mockModel.findOne.mockReturnValue({ lean: jest.fn().mockReturnValue({ exec }) });

    const result = await repository.findByPhone('org-001', '+212600000001');

    expect(mockModel.findOne).toHaveBeenCalledWith({
      org_id: 'org-001',
      phone: '+212600000001',
    });
    expect(result).toBe(patient);
  });

  it('create persists required fields and returns created patient', async () => {
    mockPrisma.organization.update.mockResolvedValue({
      mrnPrefix: 'MC',
      mrnCounter: 42,
    });

    const createdPatient = {
      _id: 'pat-001',
      org_id: 'org-001',
      mrn: 'MC-2026-00042',
      phone: '+212600000001',
    };

    mockModel.create.mockResolvedValue(createdPatient);

    const result = await repository.create('org-001', {
      name_first: 'Amina',
      name_last: 'Zaki',
      phone: '+212600000001',
      dob: '1990-01-01',
      email: 'amina@example.com',
    });

    expect(mockModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-001',
        phone: '+212600000001',
        name: {
          first: 'Amina',
          last: 'Zaki',
          display: 'Amina Zaki',
        },
      }),
    );
    expect(result).toBe(createdPatient);
  });
});
