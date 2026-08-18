/**
 * Node half of the client plugin: loaded as a host composition row so the
 * dsh-client-modules scan discovers the dsh.client declaration. No host-side
 * contribution - the browser half ships via exports['./client'].
 */

export const name = 'ui-learning'

export function apply(): void {}
