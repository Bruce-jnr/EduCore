import{z}from'zod';const status=z.enum(['PRESENT','ABSENT','LATE','EXCUSED']);
export const rosterSchema=z.object({body:z.any(),params:z.any(),query:z.object({classId:z.string().min(1),academicPeriodId:z.string().min(1),date:z.iso.date()})});
export const saveAttendanceSchema=z.object({query:z.any(),params:z.any(),body:z.object({classId:z.string().min(1),academicPeriodId:z.string().min(1),date:z.iso.date(),records:z.array(z.object({studentId:z.string().min(1),status,remarks:z.string().trim().max(250).optional()})).min(1)})});
