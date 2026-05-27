import * as xkt001 from "../endpoints/urban-planning/xkt001.js";
import * as xkt002 from "../endpoints/urban-planning/xkt002.js";
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
  landUseZones: {
    (params: xkt002.Params, opts: xkt002.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xkt002.Params,
      opts?: xkt002.CallOptsGeoJson,
    ): Promise<Result<xkt002.Response, ReinfolibError>>;
  };
};

export function createUrbanPlanningFacade(client: ReinfolibClient): UrbanPlanningFacade {
  return {
    zoning: ((params, opts) =>
      xkt001.call(client, params, opts as xkt001.CallOptsPbf)) as UrbanPlanningFacade["zoning"],
    landUseZones: ((params, opts) =>
      xkt002.call(
        client,
        params,
        opts as xkt002.CallOptsPbf,
      )) as UrbanPlanningFacade["landUseZones"],
  };
}
