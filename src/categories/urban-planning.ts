import * as xkt001 from "../endpoints/urban-planning/xkt001.js";
import * as xkt002 from "../endpoints/urban-planning/xkt002.js";
import * as xkt003 from "../endpoints/urban-planning/xkt003.js";
import * as xkt014 from "../endpoints/urban-planning/xkt014.js";
import * as xkt023 from "../endpoints/urban-planning/xkt023.js";
import * as xkt024 from "../endpoints/urban-planning/xkt024.js";
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
  locationOptimization: {
    (params: xkt003.Params, opts: xkt003.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xkt003.Params,
      opts?: xkt003.CallOptsGeoJson,
    ): Promise<Result<xkt003.Response, ReinfolibError>>;
  };
  firePrevention: {
    (params: xkt014.Params, opts: xkt014.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xkt014.Params,
      opts?: xkt014.CallOptsGeoJson,
    ): Promise<Result<xkt014.Response, ReinfolibError>>;
  };
  districtPlans: {
    (params: xkt023.Params, opts: xkt023.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xkt023.Params,
      opts?: xkt023.CallOptsGeoJson,
    ): Promise<Result<xkt023.Response, ReinfolibError>>;
  };
  highUseDistricts: {
    (params: xkt024.Params, opts: xkt024.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xkt024.Params,
      opts?: xkt024.CallOptsGeoJson,
    ): Promise<Result<xkt024.Response, ReinfolibError>>;
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
    locationOptimization: ((params, opts) =>
      xkt003.call(
        client,
        params,
        opts as xkt003.CallOptsPbf,
      )) as UrbanPlanningFacade["locationOptimization"],
    firePrevention: ((params, opts) =>
      xkt014.call(
        client,
        params,
        opts as xkt014.CallOptsPbf,
      )) as UrbanPlanningFacade["firePrevention"],
    districtPlans: ((params, opts) =>
      xkt023.call(
        client,
        params,
        opts as xkt023.CallOptsPbf,
      )) as UrbanPlanningFacade["districtPlans"],
    highUseDistricts: ((params, opts) =>
      xkt024.call(
        client,
        params,
        opts as xkt024.CallOptsPbf,
      )) as UrbanPlanningFacade["highUseDistricts"],
  };
}
