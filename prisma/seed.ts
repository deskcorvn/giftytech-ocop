import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, type UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { EVIDENCE_DEFINITIONS, OCOP_PROGRAM, QUANG_HAI_ANSWERS, QUANG_HAI_PROFILE, RUBRIC_CRITERIA, STAGES, TASKS } from "../src/lib/curriculum/ocop-v1";
import { buildTaskLearningContent } from "../src/lib/curriculum/ocop-learning-content";
import { certificatePublicId } from "../src/lib/domain/gates";
import { hashJson } from "../src/lib/domain/hash";

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required for seeding.");

const passwords = {
  admin: process.env.SEED_ADMIN_PASSWORD,
  mentor: process.env.SEED_MENTOR_PASSWORD,
  learner: process.env.SEED_LEARNER_PASSWORD,
};
for (const [name, value] of Object.entries(passwords)) {
  if (!value || value.length < 12) throw new Error(`SEED_${name.toUpperCase()}_PASSWORD must contain at least 12 characters.`);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function upsertUser(username: string, displayName: string, role: UserRole, password: string) {
  const passwordHash = await hash(password, 12);
  return prisma.user.upsert({
    where: { username },
    create: { username, displayName, role, status: "ACTIVE", credential: { create: { passwordHash } } },
    update: { displayName, role, status: "ACTIVE", credential: { upsert: { create: { passwordHash }, update: { passwordHash } } } },
  });
}

async function main() {
  const program = await prisma.program.upsert({
    where: { code: OCOP_PROGRAM.code },
    create: { code: OCOP_PROGRAM.code, name: OCOP_PROGRAM.name },
    update: { name: OCOP_PROGRAM.name },
  });
  const programVersion = await prisma.programVersion.upsert({
    where: { programId_version: { programId: program.id, version: OCOP_PROGRAM.version } },
    create: {
      programId: program.id,
      version: OCOP_PROGRAM.version,
      title: OCOP_PROGRAM.title,
      description: OCOP_PROGRAM.description,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    update: { title: OCOP_PROGRAM.title, description: OCOP_PROGRAM.description, status: "PUBLISHED" },
  });

  const stageMap = new Map<string, string>();
  for (const stage of STAGES) {
    const record = await prisma.stageDefinition.upsert({
      where: { programVersionId_code: { programVersionId: programVersion.id, code: stage.code } },
      create: { programVersionId: programVersion.id, ...stage },
      update: { title: stage.title, position: stage.position },
    });
    stageMap.set(stage.code, record.id);
  }

  const evidenceMap = new Map<string, string>();
  for (const evidence of EVIDENCE_DEFINITIONS) {
    const record = await prisma.evidenceDefinition.upsert({
      where: { programVersionId_code: { programVersionId: programVersion.id, code: evidence.code } },
      create: { programVersionId: programVersion.id, ...evidence },
      update: evidence,
    });
    evidenceMap.set(evidence.code, record.id);
  }

  const taskMap = new Map<string, string>();
  for (const task of TASKS) {
    const stageId = stageMap.get(task.stageCode);
    if (!stageId) throw new Error(`Missing stage ${task.stageCode}`);
    const record = await prisma.taskDefinition.upsert({
      where: { programVersionId_code: { programVersionId: programVersion.id, code: task.code } },
      create: {
        programVersionId: programVersion.id,
        stageId,
        code: task.code,
        title: task.title,
        objective: task.objective,
        instructions: task.instructions,
        position: task.position,
        estimateMinutes: task.estimateMinutes,
        weight: task.weight,
        gateCode: task.gateCode,
        fieldSchema: task.fields as unknown as Prisma.InputJsonValue,
        contentSchema: buildTaskLearningContent(task.code, QUANG_HAI_ANSWERS[task.code]) as Prisma.InputJsonValue,
      },
      update: {
        stageId,
        title: task.title,
        objective: task.objective,
        instructions: task.instructions,
        position: task.position,
        estimateMinutes: task.estimateMinutes,
        weight: task.weight,
        gateCode: task.gateCode,
        fieldSchema: task.fields as unknown as Prisma.InputJsonValue,
        contentSchema: buildTaskLearningContent(task.code, QUANG_HAI_ANSWERS[task.code]) as Prisma.InputJsonValue,
      },
    });
    taskMap.set(task.code, record.id);
    for (const evidenceCode of task.evidenceCodes) {
      const evidenceDefinitionId = evidenceMap.get(evidenceCode);
      if (!evidenceDefinitionId) throw new Error(`Missing evidence ${evidenceCode}`);
      await prisma.taskEvidenceRequirement.upsert({
        where: { taskDefinitionId_evidenceDefinitionId: { taskDefinitionId: record.id, evidenceDefinitionId } },
        create: { taskDefinitionId: record.id, evidenceDefinitionId, required: true },
        update: { required: true },
      });
    }
  }

  for (const criterion of RUBRIC_CRITERIA) {
    await prisma.rubricCriterion.upsert({
      where: { programVersionId_code: { programVersionId: programVersion.id, code: criterion.code } },
      create: { programVersionId: programVersion.id, ...criterion },
      update: criterion,
    });
  }

  const admin = await upsertUser("ocop.admin", "Điều phối OCOP", "ADMIN", passwords.admin!);
  const mentor = await upsertUser("ocop.mentor", "Mentor OCOP", "MENTOR", passwords.mentor!);
  const learner = await upsertUser("quanghai.learner", QUANG_HAI_PROFILE.learnerName, "LEARNER", passwords.learner!);
  const completedLearner = await upsertUser("quanghai.completed", `${QUANG_HAI_PROFILE.learnerName} (hoàn thành)`, "LEARNER", passwords.learner!);

  const now = new Date();
  const demoCompletedAt = new Date("2026-07-30T10:00:00+07:00");
  const cohort = await prisma.cohort.upsert({
    where: { code: "OCOP-HP-2026-DEMO" },
    create: {
      programVersionId: programVersion.id,
      code: "OCOP-HP-2026-DEMO",
      name: "Pilot OCOP Hải Phòng 2026",
      status: "ACTIVE",
      startAt: now,
      endAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      baselineCount: 20,
    },
    update: { programVersionId: programVersion.id, status: "ACTIVE", baselineCount: 20 },
  });

  const freshEnrollment = await prisma.enrollment.upsert({
    where: { cohortId_userId: { cohortId: cohort.id, userId: learner.id } },
    create: {
      cohortId: cohort.id,
      userId: learner.id,
      status: "ACTIVE",
      organizationName: QUANG_HAI_PROFILE.organizationName,
      productName: QUANG_HAI_PROFILE.productName,
      province: QUANG_HAI_PROFILE.province,
      primaryChannel: QUANG_HAI_PROFILE.primaryChannel,
      consentProcessing: true,
    },
    update: { status: "ACTIVE", consentProcessing: true },
  });
  for (const task of TASKS) {
    await prisma.taskProgress.upsert({
      where: { enrollmentId_taskDefinitionId: { enrollmentId: freshEnrollment.id, taskDefinitionId: taskMap.get(task.code)! } },
      create: { enrollmentId: freshEnrollment.id, taskDefinitionId: taskMap.get(task.code)!, state: task.position === 1 ? "READY" : "LOCKED" },
      update: {},
    });
  }

  const completedEnrollment = await prisma.enrollment.upsert({
    where: { cohortId_userId: { cohortId: cohort.id, userId: completedLearner.id } },
    create: {
      cohortId: cohort.id,
      userId: completedLearner.id,
      status: "COMPLETED",
      organizationName: QUANG_HAI_PROFILE.organizationName,
      productName: QUANG_HAI_PROFILE.productName,
      province: QUANG_HAI_PROFILE.province,
      primaryChannel: QUANG_HAI_PROFILE.primaryChannel,
      consentProcessing: true,
      completedAt: demoCompletedAt,
    },
    update: { status: "COMPLETED", consentProcessing: true, completedAt: demoCompletedAt },
  });
  await prisma.productProfile.upsert({
    where: { enrollmentId: completedEnrollment.id },
    create: { enrollmentId: completedEnrollment.id, publicData: QUANG_HAI_ANSWERS["product-record"] as Prisma.InputJsonValue, sourceNotes: String(QUANG_HAI_ANSWERS["product-record"].dataSource) },
    update: { publicData: QUANG_HAI_ANSWERS["product-record"] as Prisma.InputJsonValue },
  });

  for (const task of TASKS) {
    const taskDefinitionId = taskMap.get(task.code)!;
    await prisma.taskProgress.upsert({
      where: { enrollmentId_taskDefinitionId: { enrollmentId: completedEnrollment.id, taskDefinitionId } },
      create: { enrollmentId: completedEnrollment.id, taskDefinitionId, state: "ACCEPTED", startedAt: demoCompletedAt, submittedAt: demoCompletedAt, acceptedAt: demoCompletedAt },
      update: { state: "ACCEPTED", acceptedAt: demoCompletedAt },
    });
    const submission = await prisma.submission.upsert({
      where: { enrollmentId_taskDefinitionId_version: { enrollmentId: completedEnrollment.id, taskDefinitionId, version: 1 } },
      create: { enrollmentId: completedEnrollment.id, taskDefinitionId, version: 1, payload: QUANG_HAI_ANSWERS[task.code] as Prisma.InputJsonValue, status: "ACCEPTED", submittedAt: demoCompletedAt },
      update: { payload: QUANG_HAI_ANSWERS[task.code] as Prisma.InputJsonValue, status: "ACCEPTED" },
    });
    const reviewExists = await prisma.review.count({ where: { submissionId: submission.id } });
    if (!reviewExists) {
      await prisma.review.create({ data: { submissionId: submission.id, reviewerId: mentor.id, decision: "ACCEPT", score: 100, feedback: "Đầu ra mô phỏng đạt tiêu chí giáo án và không còn cờ nghiêm trọng." } });
    }
  }

  for (const gateCode of ["G0", "G1", "G2", "G3", "G4"] as const) {
    await prisma.gateDecision.upsert({
      where: { enrollmentId_gateCode_version: { enrollmentId: completedEnrollment.id, gateCode, version: 1 } },
      create: { enrollmentId: completedEnrollment.id, gateCode, version: 1, status: "ACCEPTED", reason: `Case mô phỏng đã hoàn thành đầy đủ điều kiện ${gateCode}.`, score: 100, decidedById: mentor.id },
      update: { status: "ACCEPTED", reason: `Case mô phỏng đã hoàn thành đầy đủ điều kiện ${gateCode}.`, score: 100 },
    });
  }

  const snapshot = {
    schemaVersion: 1,
    program: { code: program.code, version: programVersion.version, title: programVersion.title },
    cohort: { code: cohort.code, name: cohort.name },
    learner: { id: completedLearner.id, name: completedLearner.displayName },
    organization: completedEnrollment.organizationName,
    product: { name: completedEnrollment.productName, profile: QUANG_HAI_ANSWERS["product-record"] },
    province: completedEnrollment.province,
    completedOutputs: TASKS.map((task) => ({ taskCode: task.code, title: task.title, weight: task.weight, submissionVersion: 1, payload: QUANG_HAI_ANSWERS[task.code], evidenceCodes: task.evidenceCodes })),
    gates: ["G0", "G1", "G2", "G3", "G4"].map((code) => ({ code, status: "ACCEPTED", version: 1 })),
    score: 100,
    completedAt: demoCompletedAt.toISOString(),
  };
  const snapshotHash = hashJson(snapshot);
  const publicId = certificatePublicId(completedEnrollment.id, snapshotHash);
  await prisma.score.upsert({
    where: { enrollmentId_version: { enrollmentId: completedEnrollment.id, version: 1 } },
    create: { enrollmentId: completedEnrollment.id, version: 1, total: 100, breakdown: { acceptedWeight: 100 }, inputHash: snapshotHash },
    update: { total: 100, breakdown: { acceptedWeight: 100 }, inputHash: snapshotHash },
  });
  await prisma.certificate.upsert({
    where: { enrollmentId: completedEnrollment.id },
    create: { publicId, enrollmentId: completedEnrollment.id, score: 100, snapshot: snapshot as Prisma.InputJsonValue, snapshotHash, issuedById: admin.id, issuedAt: demoCompletedAt },
    update: { publicId, score: 100, snapshot: snapshot as Prisma.InputJsonValue, snapshotHash, status: "ISSUED", revokedAt: null, revokeReason: null },
  });

  console.log(JSON.stringify({
    program: `${program.code}@${programVersion.version}`,
    cohort: cohort.code,
    freshJourneyUser: learner.username,
    completedJourneyUser: completedLearner.username,
    mentor: mentor.username,
    admin: admin.username,
    certificatePublicId: publicId,
  }, null, 2));
}

main().finally(async () => prisma.$disconnect());
