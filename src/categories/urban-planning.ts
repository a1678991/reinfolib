import * as xkt001 from "../endpoints/urban-planning/xkt001.js";
import type { ReinfolibClient } from "../client.js";
import type { ReinfolibError } from "../core/errors.js";
import type { Result } from "../core/result.js";

export type UrbanPlanningFacade = {
  zoning: {
    (params: xkt001.Params, opts: xkt001.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xkt001.Params,
      opts?: xkt001.CallOptsGeoJson,
    ): Promise<Result<xkt001.Response, ReinfolibError>>;
  };
};

export function createUrbanPlanningFacade(client: ReinfolibClient): UrbanPlanningFacade {
  return {
    zoning: ((params, opts) =>
      xkt001.call(client, params, opts as xkt001.CallOptsPbf)) as UrbanPlanningFacade["zoning"],
  };
}
