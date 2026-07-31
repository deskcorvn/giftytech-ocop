import { LearnerPortal } from "@/components/learner-portal";
import { OCOP_PROGRAM, STAGES, TASKS } from "@/lib/curriculum/ocop-v1";

export default function HomePage() {
  const curriculum = STAGES.map((stage) => ({
    code: stage.code,
    title: stage.title,
    position: stage.position,
    tasks: TASKS.filter((task) => task.stageCode === stage.code).map((task) => ({
      code: task.code,
      title: task.title,
      objective: task.objective,
      instructions: task.instructions,
      position: task.position,
      estimateMinutes: task.estimateMinutes,
      weight: task.weight,
      gateCode: task.gateCode,
      evidenceCodes: task.evidenceCodes,
      outputCount: task.fields.length,
    })),
  }));

  return <LearnerPortal program={OCOP_PROGRAM} curriculum={curriculum} />;
}
