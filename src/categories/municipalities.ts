import * as xit002 from "../endpoints/municipalities/xit002.js";
import type { ReinfolibClient, CallOptions } from "../client.js";

export type MunicipalitiesFacade = {
  list: (params: xit002.Params, opts?: CallOptions) => ReturnType<typeof xit002.call>;
};

export function createMunicipalitiesFacade(client: ReinfolibClient): MunicipalitiesFacade {
  return {
    list: (params, opts) => xit002.call(client, params, opts),
  };
}
