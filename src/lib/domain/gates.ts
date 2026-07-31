import type { GateCode } from "@prisma/client";

export const GATE_ORDER: GateCode[] = ["G0", "G1", "G2", "G3", "G4"];

export function nextGate(gate: GateCode): GateCode | null {
  const index = GATE_ORDER.indexOf(gate);
  return index >= 0 && index < GATE_ORDER.length - 1 ? GATE_ORDER[index + 1] : null;
}

export function certificatePublicId(enrollmentId: string, snapshotHash: string): string {
  return `GID-OCOP-${snapshotHash.slice(0, 8).toUpperCase()}-${enrollmentId.slice(-6).toUpperCase()}`;
}
