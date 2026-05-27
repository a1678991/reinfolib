import * as xit001 from "../endpoints/prices/xit001.js";
import * as xct001 from "../endpoints/prices/xct001.js";
import * as xpt001 from "../endpoints/prices/xpt001.js";
import * as xpt002 from "../endpoints/prices/xpt002.js";
import type { ReinfolibClient, CallOptions } from "../client.js";
import type { Result } from "../core/result.js";
import type { ReinfolibError } from "../core/errors.js";

export type PricesFacade = {
  transactionPoints: (params: xit001.Params, opts?: CallOptions) => ReturnType<typeof xit001.call>;
  appraisals: (params: xct001.Params, opts?: CallOptions) => ReturnType<typeof xct001.call>;
  priceTiles: {
    (params: xpt001.Params, opts: xpt001.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xpt001.Params,
      opts?: xpt001.CallOptsGeoJson,
    ): Promise<Result<xpt001.Response, ReinfolibError>>;
  };
  landPriceTiles: {
    (params: xpt002.Params, opts: xpt002.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xpt002.Params,
      opts?: xpt002.CallOptsGeoJson,
    ): Promise<Result<xpt002.Response, ReinfolibError>>;
  };
};

export function createPricesFacade(client: ReinfolibClient): PricesFacade {
  return {
    transactionPoints: (params, opts) => xit001.call(client, params, opts),
    appraisals: (params, opts) => xct001.call(client, params, opts),
    priceTiles: ((params, opts) =>
      xpt001.call(client, params, opts as xpt001.CallOptsPbf)) as PricesFacade["priceTiles"],
    landPriceTiles: ((params, opts) =>
      xpt002.call(client, params, opts as xpt002.CallOptsPbf)) as PricesFacade["landPriceTiles"],
  };
}
