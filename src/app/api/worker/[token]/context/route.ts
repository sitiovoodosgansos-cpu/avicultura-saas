import { NextResponse } from "next/server";
import { getWorkerLinkOr401 } from "@/lib/worker-links/auth";
import { listPlantel } from "@/lib/plantel/service";
import { listIncubatorContext } from "@/lib/incubators/service";
import { listHealthContext } from "@/lib/health/service";

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const auth = await getWorkerLinkOr401(token, "plantel");
  if (!auth.ok) return auth.response;

  const tenantId = auth.link.tenantId;

  const [plantel, incubators, health] = await Promise.all([
    listPlantel(tenantId, {}),
    auth.link.allowIncubators ? listIncubatorContext(tenantId) : Promise.resolve(null),
    auth.link.allowHealth ? listHealthContext(tenantId) : Promise.resolve(null)
  ]);

  return NextResponse.json({
    tenant: auth.link.tenant,
    link: {
      id: auth.link.id,
      label: auth.link.label,
      allowPlantel: auth.link.allowPlantel,
      allowEggs: auth.link.allowEggs,
      allowIncubators: auth.link.allowIncubators,
      allowHealth: auth.link.allowHealth
    },
    plantel: {
      groups: plantel.groups.filter(isPresent).map((group) => ({ id: group.id, title: group.title })),
      taxonomy: plantel.taxonomy
    },
    incubators: incubators
      ? {
          incubators: incubators.incubators.map((item) => ({ id: item.id, name: item.name })),
          batches: incubators.batches.map((item) => ({
            id: item.id,
            label: `${item.incubator.name} • ${item.flockGroup.title} • ${item.eggsSet} ovos`
          })),
          flockGroups: incubators.flockGroups
        }
      : null,
    health: health
      ? {
          infirmaries: health.infirmaries.map((item) => ({ id: item.id, name: item.name })),
          birds: health.birds.map((item) => ({
            id: item.id,
            label: `${item.ringNumber}${item.nickname ? ` • ${item.nickname}` : ""}`
          })),
          cases: health.cases.map((item) => ({
            id: item.id,
            label: `${item.bird.ringNumber} • ${item.infirmary.name} • ${item.status}`
          }))
        }
      : null
  });
}
