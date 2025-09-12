// We will use this function to mimic Drizzle's query-builder chain (we're faking it)
export function builder<T = unknown>(returnVal?: T): any {
  const promised = Promise.resolve(returnVal);

  const chain: any = {
    select   : () => chain,
    insert   : () => chain,
    update   : () => chain,
    from     : () => chain,
    where    : () => chain,
    and      : () => chain,
    leftJoin : () => chain,
    innerJoin: () => chain,
    groupBy  : () => chain,
    having   : () => chain,
    orderBy  : () => chain,
    set      : () => chain,
    values   : () => chain,
    for      : () => chain,
    returning: () => promised,
    limit    : () => promised,

    // make it await-able 
    then : promised.then.bind(promised),
    catch: promised.catch.bind(promised),
  };
  return chain;
}
