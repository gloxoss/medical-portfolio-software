import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SchedPgRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSchedule(doctorId: string, orgId: string, dto: CreateScheduleDto) {
    // Verify doctor belongs to org
    const doctor = await this.prisma.user.findFirst({
      where: { id: doctorId, orgId },
      select: { id: true },
    });
    if (!doctor) return null;

    try {
      return await this.prisma.doctorSchedule.create({
        data: {
          doctorId,
          facilityId: dto.facility_id,
          dayOfWeek: dto.day_of_week,
          startTime: dto.start_time,
          endTime: dto.end_time,
          slotMinutes: dto.slot_minutes ?? 15,
          breaks: (dto.breaks as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          isActive: true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Schedule already exists for this doctor/facility/day');
      }
      throw e;
    }
  }

  // FIX-2: orgId is optional to avoid breaking existing callers (createSchedule,
  // bookAppointment) that don't need the org check here. When provided by
  // getAvailability, this verifies the doctor belongs to the caller's org.
  async getSchedule(
    doctorId: string,
    facilityId: string,
    dayOfWeek: number,
    orgId?: string,
  ) {
    if (orgId) {
      // Verify the doctor belongs to the requesting org before returning schedule
      const doctor = await this.prisma.user.findFirst({
        where: { id: doctorId, orgId },
        select: { id: true },
      });
      if (!doctor) return null; // Doctor not in this org — return no schedule
    }

    return this.prisma.doctorSchedule.findFirst({
      where: { doctorId, facilityId, dayOfWeek, isActive: true },
    });
  }

  async getDoctorSchedules(doctorId: string, orgId: string) {
    const doctor = await this.prisma.user.findFirst({
      where: { id: doctorId, orgId },
      select: { id: true },
    });
    if (!doctor) return [];

    return this.prisma.doctorSchedule.findMany({
      where: { doctorId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}
