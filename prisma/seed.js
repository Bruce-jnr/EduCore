import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password || password.length < 8) {
  throw new Error(
    'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (minimum 8 characters) before seeding.',
  );
}

const permissionKeys = [
  'dashboard.view',
  'students.view',
  'students.create',
  'students.update',
  'students.archive',
  'staff.view',
  'staff.create',
  'staff.update',
  'academics.assign-teachers',
  'academics.view',
  'academics.create',
  'academics.update',
  'users.view',
  'users.create',
  'users.update',
  'roles.view',
  'roles.create',
  'roles.update',
  'attendance.view',
  'attendance.take',
  'attendance.update',
  'finance.view',
  'finance.fees.create',
  'finance.invoice.create',
  'finance.payment.create',
  'platform.schools.view',
  'platform.schools.create',
  'platform.schools.update',
  'settings.view',
  'settings.update',
];

async function seed() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'st-andrews' },
    update: {},
    create: {
      name: 'St. Andrews Excellence',
      slug: 'st-andrews',
      schoolCode: 'SAE001',
      schoolType: 'COMBINED',
      email: 'office@standrews.edu',
      settings: { create: {} },
    },
  });
  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } }),
    ),
  );
  const role = await prisma.role.upsert({
    where: {
      tenantId_name: { tenantId: tenant.id, name: 'School Administrator' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'School Administrator',
      isSystem: true,
    },
  });
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      }),
    ),
  );
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() },
    },
    update: { passwordHash, status: 'ACTIVE' },
    create: {
      tenantId: tenant.id,
      firstName: 'Kwame',
      lastName: 'Asare',
      email: email.toLowerCase(),
      passwordHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  const year = await prisma.academicYear.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: '2026/2027' } },
    update: { isCurrent: true },
    create: {
      tenantId: tenant.id,
      name: '2026/2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-07-31'),
      isCurrent: true,
    },
  });
  const schoolClass = await prisma.class.upsert({
    where: {
      tenantId_academicYearId_name_section: {
        tenantId: tenant.id,
        academicYearId: year.id,
        name: 'JHS 2',
        section: 'A',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      academicYearId: year.id,
      name: 'JHS 2',
      section: 'A',
      levelOrder: 8,
    },
  });
  await prisma.academicPeriod.upsert({
    where: { tenantId_academicYearId_name: { tenantId: tenant.id, academicYearId: year.id, name: 'Term 1' } },
    update: { isCurrent: true },
    create: { tenantId: tenant.id, academicYearId: year.id, name: 'Term 1', type: 'TERM', startDate: new Date('2026-09-01'), endDate: new Date('2026-12-18'), isCurrent: true },
  });
  for (const [code, name] of [['MATH', 'Mathematics'], ['ENG', 'English Language'], ['SCI', 'Integrated Science']]) {
    await prisma.subject.upsert({ where: { tenantId_code: { tenantId: tenant.id, code } }, update: {}, create: { tenantId: tenant.id, code, name } });
  }
  const samples = [
    ['STD-2026-001', 'Ama', 'Mensah', 'Female'],
    ['STD-2026-002', 'Kojo', 'Owusu', 'Male'],
    ['STD-2026-003', 'Nana Yaa', 'Boateng', 'Female'],
  ];
  for (const [studentNumber, firstName, lastName, gender] of samples) {
    const student = await prisma.student.upsert({
      where: { tenantId_studentNumber: { tenantId: tenant.id, studentNumber } },
      update: {},
      create: {
        tenantId: tenant.id,
        studentNumber,
        firstName,
        lastName,
        gender,
        admissionDate: new Date('2026-09-01'),
      },
    });
    await prisma.studentEnrollment.upsert({
      where: {
        tenantId_studentId_academicYearId_classId: {
          tenantId: tenant.id,
          studentId: student.id,
          academicYearId: year.id,
          classId: schoolClass.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        studentId: student.id,
        academicYearId: year.id,
        classId: schoolClass.id,
      },
    });
  }
  console.log(`Seeded ${tenant.name} with administrator ${email}`);
  const platformEmail=process.env.PLATFORM_ADMIN_EMAIL,platformPassword=process.env.PLATFORM_ADMIN_PASSWORD;
  if(platformEmail&&platformPassword?.length>=8){
    let platformRole=await prisma.role.findFirst({where:{tenantId:null,name:'Super Admin'}});if(!platformRole)platformRole=await prisma.role.create({data:{name:'Super Admin',isSystem:true}});
    const platformPermissions=await prisma.permission.findMany({where:{key:{startsWith:'platform.'}}});await Promise.all(platformPermissions.map(permission=>prisma.rolePermission.upsert({where:{roleId_permissionId:{roleId:platformRole.id,permissionId:permission.id}},update:{},create:{roleId:platformRole.id,permissionId:permission.id}})));
    let platformUser=await prisma.user.findFirst({where:{tenantId:null,email:platformEmail.toLowerCase(),isPlatformUser:true}});const platformHash=await bcrypt.hash(platformPassword,12);
    if(platformUser)platformUser=await prisma.user.update({where:{id:platformUser.id},data:{passwordHash:platformHash,status:'ACTIVE'}});else platformUser=await prisma.user.create({data:{firstName:'Platform',lastName:'Administrator',email:platformEmail.toLowerCase(),passwordHash:platformHash,status:'ACTIVE',isPlatformUser:true,emailVerifiedAt:new Date()}});
    await prisma.userRole.upsert({where:{userId_roleId:{userId:platformUser.id,roleId:platformRole.id}},update:{},create:{userId:platformUser.id,roleId:platformRole.id}});console.log(`Seeded platform administrator ${platformEmail}`);
  }else console.log('Platform administrator skipped; configure PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD to enable it.');
}

seed().finally(() => prisma.$disconnect());
