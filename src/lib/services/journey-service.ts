import type { Actor } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { getLearnerEnrollment } from "@/lib/services/enrollment-service";

export async function getJourney(actor: Actor) {
  const enrollmentBase = await getLearnerEnrollment(actor);
  const db = getPrisma();
  const enrollment = await db.enrollment.findUniqueOrThrow({
    where: { id: enrollmentBase.id },
    include: {
      cohort: {
        include: {
          programVersion: {
            include: {
              program: true,
              stages: { orderBy: { position: "asc" } },
              taskDefinitions: {
                orderBy: { position: "asc" },
                include: {
                  stage: true,
                  evidenceRequirements: { include: { evidenceDefinition: true } },
                },
              },
            },
          },
        },
      },
      taskProgress: true,
      drafts: true,
      submissions: { orderBy: { version: "desc" }, include: { reviews: { orderBy: { createdAt: "desc" } } } },
      gateDecisions: { orderBy: [{ gateCode: "asc" }, { version: "desc" }] },
      certificate: true,
    },
  });

  const progressByTask = new Map(enrollment.taskProgress.map((item) => [item.taskDefinitionId, item]));
  const draftByTask = new Map(enrollment.drafts.map((item) => [item.taskDefinitionId, item]));
  const latestSubmissionByTask = new Map<string, (typeof enrollment.submissions)[number]>();
  for (const submission of enrollment.submissions) {
    if (!latestSubmissionByTask.has(submission.taskDefinitionId)) latestSubmissionByTask.set(submission.taskDefinitionId, submission);
  }

  const tasks = enrollment.cohort.programVersion.taskDefinitions.map((task) => {
    const progress = progressByTask.get(task.id);
    const draft = draftByTask.get(task.id);
    const submission = latestSubmissionByTask.get(task.id);
    return {
      code: task.code,
      title: task.title,
      objective: task.objective,
      instructions: task.instructions,
      promise: typeof task.contentSchema === "object" && task.contentSchema && "promise" in task.contentSchema ? String(task.contentSchema.promise) : task.objective,
      position: task.position,
      stage: { code: task.stage.code, title: task.stage.title },
      gateCode: task.gateCode,
      estimateMinutes: task.estimateMinutes,
      weight: task.weight,
      state: progress?.state ?? "LOCKED",
      progressVersion: progress?.version ?? 0,
      draftVersion: draft?.version ?? 0,
      submittedVersion: submission?.version,
      submissionStatus: submission?.status,
      submittedAt: submission?.submittedAt,
      review: submission?.reviews[0]
        ? {
            decision: submission.reviews[0].decision,
            feedback: submission.reviews[0].feedback,
            score: submission.reviews[0].score,
            reviewedAt: submission.reviews[0].createdAt,
          }
        : null,
      evidence: task.evidenceRequirements.map(({ required, evidenceDefinition }) => ({
        code: evidenceDefinition.code,
        title: evidenceDefinition.title,
        required,
        allowedMimeTypes: evidenceDefinition.allowedMimeTypes,
        maxSizeBytes: evidenceDefinition.maxSizeBytes,
      })),
    };
  });

  const acceptedWeight = tasks.filter((task) => task.state === "ACCEPTED").reduce((sum, task) => sum + task.weight, 0);
  const submittedWeight = tasks
    .filter((task) => ["SUBMITTED", "REVISION_REQUIRED", "ACCEPTED"].includes(task.state))
    .reduce((sum, task) => sum + task.weight, 0);
  const nextTask =
    tasks.find((task) => task.state === "REVISION_REQUIRED") ??
    tasks.find((task) => task.state === "IN_PROGRESS") ??
    tasks.find((task) => task.state === "READY") ??
    null;

  const latestGateDecisions = new Map<string, (typeof enrollment.gateDecisions)[number]>();
  for (const gate of enrollment.gateDecisions) {
    if (!latestGateDecisions.has(gate.gateCode)) latestGateDecisions.set(gate.gateCode, gate);
  }

  return {
    learner: { id: actor.id, username: actor.username, displayName: actor.displayName },
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      organizationName: enrollment.organizationName,
      productName: enrollment.productName,
      province: enrollment.province,
      primaryChannel: enrollment.primaryChannel,
    },
    cohort: {
      id: enrollment.cohort.id,
      code: enrollment.cohort.code,
      name: enrollment.cohort.name,
      status: enrollment.cohort.status,
      startAt: enrollment.cohort.startAt,
      endAt: enrollment.cohort.endAt,
      timezone: enrollment.cohort.timezone,
    },
    program: {
      code: enrollment.cohort.programVersion.program.code,
      version: enrollment.cohort.programVersion.version,
      title: enrollment.cohort.programVersion.title,
      description: enrollment.cohort.programVersion.description,
    },
    stages: enrollment.cohort.programVersion.stages,
    tasks,
    progress: { acceptedPercent: acceptedWeight, submittedPercent: submittedWeight, totalWeight: 100 },
    gates: Array.from(latestGateDecisions.values()).map((gate) => ({
      code: gate.gateCode,
      status: gate.status,
      reason: gate.reason,
      version: gate.version,
      decidedAt: gate.createdAt,
    })),
    nextAction: nextTask ? { taskCode: nextTask.code, state: nextTask.state, title: nextTask.title } : null,
    certificate: enrollment.certificate ? { publicId: enrollment.certificate.publicId, status: enrollment.certificate.status } : null,
  };
}

export async function getTask(actor: Actor, taskCode: string) {
  const enrollment = await getLearnerEnrollment(actor);
  const db = getPrisma();
  const [scopedTask, learningContext] = await Promise.all([
    db.taskDefinition.findFirst({
      where: { code: taskCode, programVersion: { cohorts: { some: { id: enrollment.cohortId } } } },
      include: {
        stage: true,
        evidenceRequirements: { include: { evidenceDefinition: true } },
        taskProgress: { where: { enrollmentId: enrollment.id } },
        drafts: { where: { enrollmentId: enrollment.id } },
        submissions: {
          where: { enrollmentId: enrollment.id },
          orderBy: { version: "desc" },
          include: { evidenceAssets: { where: { status: "AVAILABLE" } }, reviews: { orderBy: { createdAt: "desc" } } },
        },
        evidenceAssets: {
          where: { enrollmentId: enrollment.id, status: "AVAILABLE" },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.enrollment.findUnique({
      where: { id: enrollment.id },
      include: {
        user: { select: { displayName: true } },
        productProfile: true,
        submissions: {
          where: { status: "ACCEPTED" },
          orderBy: { version: "desc" },
          include: { taskDefinition: { select: { code: true } } },
        },
      },
    }),
  ]);
  if (!scopedTask) return null;
  const previousOutputs: Record<string, unknown> = {};
  for (const submission of learningContext?.submissions ?? []) {
    if (!(submission.taskDefinition.code in previousOutputs)) previousOutputs[submission.taskDefinition.code] = submission.payload;
  }
  return {
    code: scopedTask.code,
    title: scopedTask.title,
    objective: scopedTask.objective,
    instructions: scopedTask.instructions,
    stage: scopedTask.stage,
    gateCode: scopedTask.gateCode,
    weight: scopedTask.weight,
    estimateMinutes: scopedTask.estimateMinutes,
    fieldSchema: scopedTask.fieldSchema,
    contentSchema: scopedTask.contentSchema,
    aiContext: {
      learnerName: learningContext?.user.displayName ?? actor.displayName,
      organizationName: enrollment.organizationName,
      productName: enrollment.productName,
      province: enrollment.province,
      primaryChannel: enrollment.primaryChannel,
      approvedFacts: learningContext?.productProfile?.publicData ?? previousOutputs["product-record"] ?? null,
      pendingFacts: learningContext?.productProfile?.pendingData ?? null,
      previousOutputs,
    },
    evidenceRequirements: scopedTask.evidenceRequirements.map((item) => ({ ...item.evidenceDefinition, required: item.required })),
    evidenceAssets: scopedTask.evidenceAssets.map((asset) => ({
      id: asset.id,
      code: asset.evidenceCode,
      name: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      submissionId: asset.submissionId,
      createdAt: asset.createdAt,
    })),
    progress: scopedTask.taskProgress[0] ?? null,
    draft: scopedTask.drafts[0] ?? null,
    submissions: scopedTask.submissions.map((submission) => ({
      id: submission.id,
      version: submission.version,
      payload: submission.payload,
      status: submission.status,
      submittedAt: submission.submittedAt,
      evidence: submission.evidenceAssets.map((asset) => ({ id: asset.id, code: asset.evidenceCode, name: asset.originalName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes })),
      reviews: submission.reviews.map((review) => ({ decision: review.decision, score: review.score, feedback: review.feedback, criticalFlags: review.criticalFlags, createdAt: review.createdAt })),
    })),
  };
}
