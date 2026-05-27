import * as xit001 from "../endpoints/prices/xit001.js";
import type { ReinfolibClient, CallOptions } from "../client.js";

export type PricesFacade = {
  transactionPoints: (params: xit001.Params, opts?: CallOptions) => ReturnType<typeof xit001.call>;
};

export function createPricesFacade(client: ReinfolibClient): PricesFacade {
  return {
    transactionPoints: (params, opts) => xit001.call(client, params, opts),
  };
}
